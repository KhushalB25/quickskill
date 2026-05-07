import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, getDocs, db } from '../firebase';

const useSkillStore = create(
  persist(
    (set, get) => ({
      skills: [],
      loading: false,
      error: null,

      fetchSkills: async () => {
        set({ loading: true, error: null });
        try {
          const snapshot = await getDocs(collection(db, 'skills'));
          const skills = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          set({ skills, loading: false });
          return skills;
        } catch (err) {
          const message =
            err.code === 'permission-denied'
              ? 'Permission denied. Check Firestore security rules.'
              : err.message || 'Failed to load skills.';
          set({ error: message, loading: false });
          throw err;
        }
      },

      getSkillById: (id) => {
        return get().skills.find((s) => s.id === id) || null;
      },
    }),
    {
      name: 'quickskill-skills',
      partialize: (state) => ({ skills: state.skills }),
    }
  )
);

export default useSkillStore;
