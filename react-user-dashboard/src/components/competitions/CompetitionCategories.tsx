import React from 'react';
import apiClient from '../../utils/apiClient';
import type { Category } from '../../types/dashboard';
import FormInput from '../shared/FormInput';
import { getApiErrorMessage } from '../../utils/apiErrors';

const CategoryCapacityEditor = ({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: (message: string) => void;
}) => {
  const [forms, setForms] = React.useState<Record<number, { name: string; capacity: string; registrationFee: string }>>({});

  React.useEffect(() => {
    setForms(Object.fromEntries(categories.map((category) => [
      category.id,
      {
        name: category.name,
        capacity: String(category.capacity),
        registrationFee: String(Number(category.registration_fee || 0)),
      },
    ])));
  }, [categories]);

  const updateForm = (categoryId: number, nextValues: Partial<{ name: string; capacity: string; registrationFee: string }>) => {
    setForms((current) => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        ...nextValues,
      },
    }));
  };

  const saveCategory = async (categoryId: number) => {
    const form = forms[categoryId];
    if (!form) {
      return;
    }

    const response = await apiClient.put<{ message: string }>(`/competitions/categories/${categoryId}`, {
      name: form.name,
      capacity: Number(form.capacity),
      registrationFee: Number(form.registrationFee || 0),
    });
    onChanged(response.data.message || 'Category updated.');
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="inline-form">
      <h3>Category Capacity</h3>
      <p className="panel-intro">Competition size is calculated from category capacities. Capacity cannot be lower than active signups.</p>
      <div className="grid gap-3">
        {categories.map((category) => {
          const form = forms[category.id] || {
            name: category.name,
            capacity: String(category.capacity),
            registrationFee: String(Number(category.registration_fee || 0)),
          };

          return (
            <article key={category.id} className="rounded-xl border border-app-border bg-app-surfaceSoft p-4">
              <div className="form-grid">
                <FormInput label="Category" value={form.name} onChange={(name) => updateForm(category.id, { name })} required />
                <FormInput label="Capacity" type="number" value={form.capacity} onChange={(capacity) => updateForm(category.id, { capacity })} required />
                <FormInput label="Fee" type="number" value={form.registrationFee} onChange={(registrationFee) => updateForm(category.id, { registrationFee })} />
              </div>
              <button type="button" className="primary-action compact" onClick={() => saveCategory(category.id)}>
                Save Category
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const CreateCategoryForm = ({
  competitionId,
  onCreated,
}: {
  competitionId: number;
  onCreated: (message: string) => void;
}) => {
  const [name, setName] = React.useState('');
  const [capacity, setCapacity] = React.useState('16');
  const [registrationFee, setRegistrationFee] = React.useState('0');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post(`/competitions/${competitionId}/categories`, {
      name,
      capacity: Number(capacity),
      registrationFee: Number(registrationFee),
    });
    setName('');
    onCreated('Category added.');
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add Category</h3>
      <div className="form-grid">
        <FormInput label="Name" value={name} onChange={setName} required />
        <FormInput label="Capacity" type="number" value={capacity} onChange={setCapacity} required />
        <FormInput label="Fee" type="number" value={registrationFee} onChange={setRegistrationFee} />
      </div>
      <button type="submit" className="primary-action compact">Add Category</button>
    </form>
  );
};

const CategoriesPanel = ({
  categories,
  onRegistered,
}: {
  categories: Category[];
  onRegistered: (message: string) => void;
}) => {
  const registerForCategory = async (category: Category) => {
    try {
      const response = await apiClient.post<{ message: string }>(`/competitions/categories/${category.id}/register`);
      onRegistered(response.data.message || `Registration submitted for ${category.name}.`);
    } catch (error) {
      onRegistered(getApiErrorMessage(error, 'Could not register for this competition.'));
    }
  };
  const existingCompetitionRegistration = categories.find((category) => category.current_user_registration_status);

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Member entry</p>
          <h2>Categories</h2>
        </div>
      </div>
      <div className="category-list">
        {categories.map((category) => {
          const registerLabel = category.registration_closed && category.current_user_registration_status !== 'Registered'
            ? 'Registration Closed'
            : category.current_user_registration_status || (existingCompetitionRegistration ? 'Already Registered' : 'Register');

          return (
            <article className="category-item" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <small>
                  Capacity {category.capacity} - Fee ${Number(category.registration_fee).toFixed(2)}
                  {category.registration_closed ? ' - Registration closed' : ''}
                  {category.current_user_registration_status && !category.registration_closed ? ` - ${category.current_user_registration_status}` : ''}
                </small>
              </div>
              <button type="button" className="secondary-action compact" disabled={Boolean(existingCompetitionRegistration) || category.registration_closed} onClick={() => registerForCategory(category)}>
                {registerLabel}
              </button>
            </article>
          );
        })}
        {categories.length === 0 && <p className="empty-state">No categories added yet.</p>}
      </div>
    </div>
  );
};

export { CategoriesPanel, CategoryCapacityEditor, CreateCategoryForm };
