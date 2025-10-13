import { useState, useEffect } from 'react';

export interface CourseModuleProgress {
  completed: boolean;
  lastPosition: number;
  lastAccessed: string;
}

export interface CourseProgress {
  [courseModuleId: string]: CourseModuleProgress;
}

export interface UserProgress {
  [courseId: string]: CourseProgress;
}

const LOCAL_STORAGE_KEY = 'maistro:academy:progress';

const getUserProgress = (): UserProgress => {
  const userProgressData = localStorage.getItem(LOCAL_STORAGE_KEY);
  const userProgress = userProgressData ? JSON.parse(userProgressData) : {};
  return userProgress;
};

const setUserProgress = (userProgress: UserProgress) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userProgress));
};

const useLocalProgresss = (courseId: string, totalCourseModules: number) => {
  const [courseProgress, setCourseProgress] = useState<CourseProgress>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setIsLoading(true);
      const userProgress = getUserProgress();
      const courseProgress = userProgress[courseId] || {};
      setCourseProgress(courseProgress);
    } catch (error) {
      console.error('Error loading progress:', error);
      setCourseProgress({});
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const saveCourseModuleProgress = (
    moduleId: string,
    courseModuleProgressUpdate: Partial<CourseModuleProgress>
  ) => {
    const now = new Date().toISOString();
    const userProgress = getUserProgress();
    const courseProgress = userProgress[courseId] || {
      [courseId]: {},
    };

    const courseModuleProgress = courseProgress[moduleId] || {
      completed: false,
      lastPosition: 0,
      lastAccessed: now,
    };

    const updatedCourseModuleProgress: CourseModuleProgress = {
      ...courseModuleProgress,
      ...courseModuleProgressUpdate,
      lastAccessed: now,
    };

    const updatedCourseProgress: CourseProgress = {
      ...courseProgress,
      [moduleId]: updatedCourseModuleProgress,
    };

    const updatedUserProgress: UserProgress = {
      ...userProgress,
      [courseId]: updatedCourseProgress,
    };

    setUserProgress(updatedUserProgress);
    setCourseProgress(updatedCourseProgress);
  };

  const setModuleCompleted = (moduleId: string): void => {
    saveCourseModuleProgress(moduleId, {
      completed: true,
    });
  };

  const setModulePosition = (moduleId: string, position: number): void => {
    saveCourseModuleProgress(moduleId, {
      lastPosition: position,
    });
  };

  const getModuleProgress = (moduleId: string): CourseModuleProgress => {
    return courseProgress[moduleId] || {};
  };

  const getCourseProgressPercentage = (): number => {
    const completedModules = Object.values(courseProgress).filter(
      (module) => module.completed
    ).length;

    return Math.round((completedModules / totalCourseModules) * 100);
  };

  return {
    courseProgress,
    isLoading,

    getCourseProgressPercentage,
    setCourseProgress,

    getModuleProgress,
    setModulePosition,
    setModuleCompleted,
  };
};

export default useLocalProgresss;
