import { createContext, useContext, useState } from 'react';

const CourseContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useCourse() {
  return useContext(CourseContext);
}

export function CourseProvider({ children }) {
  // null means "All Courses"
  const [courseId, setCourseId] = useState(null);
  return (
    <CourseContext.Provider value={{ courseId, setCourseId }}>
      {children}
    </CourseContext.Provider>
  );
}
