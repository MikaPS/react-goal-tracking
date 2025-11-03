import React, { useState, useEffect } from "react";
import './App.css'
// make objects draggable/droppable
import { DndContext } from '@dnd-kit/core';
import { Draggable } from './Draggable';
import { Droppable } from './Droppable';
// add a database
import { supabase } from "./supabase";

export default function App() {
  // States
  const [goal, setGoal] = useState(""); // state to let user enter goals
  const [submittedGoals, setSubmittedGoals] = useState([]); // list of submitted goals
  const [view, setView] = useState("input"); // "input" or "dashboard"
  const [user, setUser] = useState(null) // check if a user is logged in
  const [saving, setSaving] = useState(false); // save operations
  const [dragSaving, setDragSaving] = useState(false);
  // make objects draggable and droppable
  const containers = ['Not Started', 'In Progress', 'Done'];
  // const [parent, setParent] = useState(null);


  // log user in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInAnonymously().then(({ data }) => {
          setUser(data.user)
        })
      } else {
        setUser(session.user)
      }
    })
  }, [])


  // checks if there are already saved goals in teh DB
  useEffect(() => {
    async function fetchGoals() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // no session = nothing to load
        setSubmittedGoals([])
        return
      }

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      // if no rows exist for this user yet data is empty
      if (error) {
        console.error("fetchGoals error", error)
        setSubmittedGoals([])
        return
      }
      setSubmittedGoals(data ?? [])
    }
    fetchGoals()
  }, [])

  // function that updates after each goal the user enters
  async function handleSubmit(event) {
    event.preventDefault();
    if (goal.trim() === "") return;
    const isDuplicate = submittedGoals.some((g) => g.text.toLowerCase() === goal.trim().toLowerCase());
    if (isDuplicate) {
      alert("This goal already exists!");
      return;
    }
    setSaving(true);

    // save goal text and color
    const colors = [
      "#d5f6ddff",
      "#ecddffff",
      "#daf5feff",
      "#ede9ffff",
      "#dafef3ff",
      "#fefddaff",
      "#eafde1ff",
    ];
    const column = "Not Started";
    const color = colors[submittedGoals.length % colors.length];
    const { data, error } = await supabase
      .from("goals")
      .insert([{
        text: goal,
        color,
        status: "Not Started",
        user_id: user.id
      }])
      .select()


    if (!error) {
      setSubmittedGoals(prev => [...prev, data[0]]);
    }

    setGoal("");
    setSaving(false);
  }

  // function to remove a goal based on its index
  async function handleDelete(id) {
    // remove from UI
    setSubmittedGoals(prev => prev.filter(g => g.id !== id));
    // remove in DB
    await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  }


  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    setDragSaving(true);

    const goalId = active.id;
    const newColumn = over.id;

    // Update in Supabase
    const { data, error } = await supabase
      .from("goals")
      .update({ status: newColumn })
      .eq("id", goalId)
      .eq("user_id", user.id)
      .select();
    console.log(error);


    if (!error) {
      setSubmittedGoals(prev =>
        prev.map(g => (g.id === goalId ? { ...g, status: newColumn } : g))
      );
    }

    setDragSaving(false);

  }


  // actual view on the webpage
  let content;
  if (view === "input") {
    content = (
      <div style={{ fontFamily: "sans-serif", padding: 20 }}>
        <h1>Please enter your goals</h1>
        <form onSubmit={handleSubmit}>
          <input
            className="goal-form"
            type="text"
            placeholder="Type your goal here"
            value={goal}
            onChange={(e) => setGoal(e.target.value)} // update as user types
            style={{ padding: 8, width: "60%" }}
          />
          <button
            type="submit"
            style={{ marginLeft: 8, padding: "8px 12px" }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Add Goal"}
          </button>
        </form>

        <div className="goal-list">
          {submittedGoals.map((g) => (
            <div
              key={g.id}
              className="goal-bubble"
              style={{
                backgroundColor: g.color,
              }}
            >
              <button
                className="delete-btn"
                onClick={() => handleDelete(g.id)}
                title="Delete this goal"
              >
                X
              </button>
              {g.text}
            </div>
          ))}
        </div>
      </div>
    );
  }
  else if (view === "dashboard") {
    const total = submittedGoals.length;
    const counts = {
      notStarted: submittedGoals.filter(g => g.status === "Not Started").length,
      inProgress: submittedGoals.filter(g => g.status === "In Progress").length,
      done: submittedGoals.filter(g => g.status === "Done").length,
    };

    content = (
      <>
        <div>
          <h1>Dashboard</h1>
          <p
            style={{ marginLeft: 8, padding: "8px 12px" }}
            disabled={dragSaving}
          >
            {dragSaving ? "Saving…" : "Move your goals as needed!"}
          </p>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <strong>Total Goals:</strong> {total} |{" "}
          <strong>Not Started:</strong> {counts.notStarted} |{" "}
          <strong>In Progress:</strong> {counts.inProgress} |{" "}
          <strong>Done:</strong> {counts.done}
        </div>
        <div>
          <DndContext onDragEnd={handleDragEnd}>
            <div className="dashboard-container">
              {containers.map((containerId) => (
                <Droppable key={containerId} id={containerId} className="column">
                  <h3>{containerId}</h3>

                  {submittedGoals
                    .filter((g) => g.status === containerId) // only goals in this column
                    .map((g) => (
                      <Draggable key={g.id} id={g.id}>
                        <div
                          className="goal-bubble"
                          style={{ backgroundColor: g.color }}
                        >
                          {g.text}
                        </div>
                      </Draggable>
                    ))}
                </Droppable>
              ))}
            </div>
          </DndContext>
        </div>
      </>
    );
  }

  return (

    <div>
      {content}
      <button
        className="switch-btn"
        onClick={() => setView(view === "input" ? "dashboard" : "input")}
      >
        {view === "input" ? "Finished Adding Goals" : "Edit Goals"}
      </button>

    </div>

  )
}
