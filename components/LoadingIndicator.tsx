// components/LoadingIndicator.tsx
import React from 'react';

export default function LoadingIndicator() {
  return (
    <div className="flex justify-center py-6 ">
      <div className="flex space-x-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="w-3 h-3 bg-blue-700 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          ></div>
        ))}
      </div>
    </div>
  );
};
