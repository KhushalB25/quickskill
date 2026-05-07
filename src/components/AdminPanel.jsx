import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, getDocs, doc, setDoc, deleteDoc, db } from '../firebase';
import useSkillStore from '../stores/useSkillStore';

export default function AdminPanel() {
  const [skills, setSkills] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { fetchSkills } = useSkillStore();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      enhances: '',
      example: '',
      type: 'cognitive',
      difficulty: 'medium',
      questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'skills'));
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSkills(list);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load skills.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const onSubmit = async (data) => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        name: data.name,
        description: data.description,
        enhances: data.enhances,
        example: data.example,
        type: data.type,
        difficulty: data.difficulty,
        questionBank: data.questions.map((q) => ({
          questionText: q.questionText,
          options: q.options.filter((o) => o.trim()),
          correctAnswer: q.correctAnswer,
        })),
      };

      if (editingId) {
        await setDoc(doc(db, 'skills', editingId), payload, { merge: true });
        setMessage({ type: 'success', text: 'Skill updated successfully!' });
      } else {
        const newRef = doc(collection(db, 'skills'));
        await setDoc(newRef, payload);
        setMessage({ type: 'success', text: 'Skill created successfully!' });
      }

      reset();
      setEditingId(null);
      await loadSkills();
      await fetchSkills();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (skill) => {
    setEditingId(skill.id);
    setValue('name', skill.name);
    setValue('description', skill.description);
    setValue('enhances', skill.enhances || '');
    setValue('example', skill.example || '');
    setValue('type', skill.type);
    setValue('difficulty', skill.difficulty);
    setValue(
      'questions',
      skill.questionBank.map((q) => ({
        questionText: q.questionText,
        options: q.options || ['', '', '', ''],
        correctAnswer: q.correctAnswer,
      }))
    );
    setMessage({ type: '', text: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this skill? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'skills', id));
      setMessage({ type: 'success', text: 'Skill deleted.' });
      await loadSkills();
      await fetchSkills();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner-neural" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-white mb-6">Admin Panel</h1>

      {message.text && (
        <div className={`mb-4 rounded-xl border px-5 py-3 text-sm font-body ${
          message.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : 'border-neon-coral/20 bg-neon-coral/10 text-neon-coral'
        }`}>
          {message.text}
        </div>
      )}

      {/* Form */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-display text-lg font-bold text-white/80 mb-4">
          {editingId ? 'Edit Skill' : 'Add New Skill'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Name *</label>
              <input {...register('name', { required: true })} className="input-neural" />
              {errors.name && <p className="text-xs text-neon-coral mt-1">Required</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Type</label>
                <select {...register('type')} className="input-neural">
                  <option value="cognitive">Cognitive</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="memory">Memory</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Difficulty</label>
                <select {...register('difficulty')} className="input-neural">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Description *</label>
            <textarea {...register('description', { required: true })} rows={2} className="input-neural resize-none" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Enhances</label>
              <input {...register('enhances')} className="input-neural" placeholder="e.g., Memory, Focus" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">Example</label>
              <input {...register('example')} className="input-neural" placeholder="e.g., Remember 5 digits" />
            </div>
          </div>

          {/* Questions */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3 font-body">
              Question Bank ({fields.length})
            </h3>

            {fields.map((field, idx) => (
              <div key={field.id} className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/40 font-body">Question {idx + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)} className="text-xs text-neon-coral hover:text-neon-coral/80 font-body">
                      Remove
                    </button>
                  )}
                </div>
                <input {...register(`questions.${idx}.questionText`, { required: true })} placeholder="Question text" className="input-neural mb-2" />
                <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((optIdx) => (
                    <input
                      key={optIdx}
                      {...register(`questions.${idx}.options.${optIdx}`)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="input-neural"
                    />
                  ))}
                </div>
                <input {...register(`questions.${idx}.correctAnswer`, { required: true })} placeholder="Correct answer (must match one option exactly)" className="input-neural" />
              </div>
            ))}

            <button
              type="button"
              onClick={() => append({ questionText: '', options: ['', '', '', ''], correctAnswer: '' })}
              className="text-sm font-medium text-neon-cyan hover:text-neon-cyan/80 transition-colors font-body"
            >
              + Add Question
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editingId ? 'Update Skill' : 'Create Skill'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Skills List */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-white/80">Existing Skills ({skills.length})</h2>
        </div>
        {skills.length === 0 ? (
          <p className="p-6 text-sm text-white/30 font-body">No skills yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {skills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-white/80 font-body">{skill.name}</p>
                  <p className="text-xs text-white/40 font-body capitalize">
                    {skill.type} | {skill.difficulty} | {skill.questionBank?.length || 0} questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(skill)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-neon-cyan transition-colors hover:bg-neon-cyan/[0.08] font-body">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(skill.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-neon-coral transition-colors hover:bg-neon-coral/[0.08] font-body">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
