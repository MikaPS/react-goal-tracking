import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export function Droppable({ id, children, className, style }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        background: isOver ? "#e8ffe8" : "#f9f9f9",
        ...style
      }}
    >
      {children}
    </div>
  );
}
