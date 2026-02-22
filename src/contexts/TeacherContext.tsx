import React, { createContext, useContext, useState, useEffect } from 'react';
import { Teacher, TEACHERS } from '../types';
import { seedDatabase } from '../seed';

interface TeacherContextType {
  currentTeacher: Teacher | null;
  setTeacher: (teacherId: string) => void;
  logout: () => void;
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    const savedTeacherId = localStorage.getItem('selectedTeacherId');
    if (savedTeacherId) {
      const teacher = TEACHERS.find(t => t.id === savedTeacherId);
      if (teacher) setCurrentTeacher(teacher);
    }
  }, []);

  useEffect(() => {
    if (currentTeacher) {
      void seedDatabase(currentTeacher.id).catch((error) => {
        console.error('Error seeding teacher database:', error);
      });
    }
  }, [currentTeacher]);

  const setTeacher = (teacherId: string) => {
    const teacher = TEACHERS.find(t => t.id === teacherId);
    if (teacher) {
      setCurrentTeacher(teacher);
      localStorage.setItem('selectedTeacherId', teacherId);
    }
  };

  const logout = () => {
    setCurrentTeacher(null);
    localStorage.removeItem('selectedTeacherId');
  };

  return (
    <TeacherContext.Provider value={{ currentTeacher, setTeacher, logout }}>
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacher() {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
}
