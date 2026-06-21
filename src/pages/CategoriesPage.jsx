import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import Navbar from '../components/Navbar';
import CategoryCard from '../components/CategoryCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCategories } from '../hooks/useCategories';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setCreating(true);
      await createCategory(newName.trim());
      setNewName('');
      setShowCreate(false);
      toast.success('Category created!');
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id, name) => {
    try {
      await updateCategory(id, name);
      toast.success('Category updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container">
          {/* Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 id="categories-title">Categories</h1>
              <p>Organize your quiz questions into categories</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              id="btn-new-category"
            >
              <Plus size={16} />
              New Category
            </button>
          </div>

          {/* Create Category Form */}
          {showCreate && (
            <div className="card animate-in" style={{ marginBottom: 'var(--space-6)' }}>
              <form
                onSubmit={handleCreate}
                style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}
                id="create-category-form"
              >
                <div className="input-group" style={{ flex: 1 }}>
                  <label htmlFor="new-category-name">Category Name</label>
                  <input
                    id="new-category-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Biology 101, Machine Learning..."
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !newName.trim()}
                  id="btn-save-category"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                  }}
                  id="btn-cancel-category"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Categories Grid */}
          {loading ? (
            <LoadingSpinner text="Loading categories..." />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No categories yet"
              description="Categories help you organize your quiz questions by subject or topic. Create your first one to get started."
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={16} /> Create Your First Category
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat, i) => (
                <div key={cat.id} className={`animate-in stagger-${Math.min(i + 1, 6)}`}>
                  <CategoryCard
                    category={cat}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
