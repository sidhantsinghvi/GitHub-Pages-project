import { useState } from 'react'
import useHouseStore from '../store/houseStore.js'
import { generateLayout } from '../lib/layoutGenerator.js'

const STYLES = ['Modern', 'Victorian', 'Mediterranean', 'Craftsman', 'Minimalist', 'Colonial', 'Industrial']
const INTERIOR_STYLES = ['Open plan', 'Traditional', 'Scandinavian', 'Japanese minimal', 'Bohemian']
const SPECIAL_FEATURES = ['home office', 'gym', 'basement', 'attic', 'balcony', 'rooftop terrace']

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
                 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  )
}

export default function InputPanel({ collapsed, onCollapse }) {
  const { setHouse } = useHouseStore()

  const [form, setForm] = useState({
    plotWidth: 60,
    plotDepth: 80,
    stories: 1,
    bedrooms: 3,
    bathrooms: 2,
    pool: false,
    garage: 'none',
    garden: 'back',
    style: 'Modern',
    interiorStyle: 'Open plan',
    specialFeatures: [],
  })

  const [error, setError] = useState('')

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))

  const toggleFeature = (feat) => {
    setForm((f) => ({
      ...f,
      specialFeatures: f.specialFeatures.includes(feat)
        ? f.specialFeatures.filter((x) => x !== feat)
        : [...f.specialFeatures, feat],
    }))
  }

  const handleGenerate = () => {
    try {
      const house = generateLayout(form)
      setHouse(house)
      onCollapse(true)
    } catch (e) {
      setError(e.message)
    }
  }

  if (collapsed) {
    return (
      <aside className="w-10 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={() => onCollapse(false)}
          title="Expand panel"
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-80 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <span className="font-semibold text-gray-800 text-sm">House Parameters</span>
        <button
          onClick={() => onCollapse(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Collapse panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Plot size */}
        <Field label="Plot Size (ft)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={20}
              max={200}
              value={form.plotWidth}
              onChange={setNum('plotWidth')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Width"
            />
            <span className="text-gray-400 text-sm">×</span>
            <input
              type="number"
              min={20}
              max={200}
              value={form.plotDepth}
              onChange={setNum('plotDepth')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Depth"
            />
          </div>
        </Field>

        <Field label="Stories">
          <Select
            value={form.stories}
            onChange={(v) => set('stories')(Number(v))}
            options={[{ value: 1, label: '1 story' }, { value: 2, label: '2 stories' }]}
          />
        </Field>

        <Field label="Bedrooms">
          <Select
            value={form.bedrooms}
            onChange={(v) => set('bedrooms')(Number(v))}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n} bedroom${n > 1 ? 's' : ''}` }))}
          />
        </Field>

        <Field label="Bathrooms">
          <Select
            value={form.bathrooms}
            onChange={(v) => set('bathrooms')(Number(v))}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n} bathroom${n > 1 ? 's' : ''}` }))}
          />
        </Field>

        <Field label="Garage">
          <Select
            value={form.garage}
            onChange={set('garage')}
            options={[
              { value: 'none', label: 'No garage' },
              { value: '1-car', label: '1-car garage' },
              { value: '2-car', label: '2-car garage' },
            ]}
          />
        </Field>

        <Field label="Garden / Yard">
          <Select
            value={form.garden}
            onChange={set('garden')}
            options={[
              { value: 'none', label: 'None' },
              { value: 'front', label: 'Front yard' },
              { value: 'back', label: 'Back yard' },
              { value: 'both', label: 'Front & back' },
            ]}
          />
        </Field>

        {/* Pool toggle */}
        <Field label="Swimming Pool">
          <button
            onClick={() => set('pool')(!form.pool)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium
                        transition-colors ${
                          form.pool
                            ? 'bg-sky-100 border-sky-400 text-sky-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
          >
            <span className="text-lg">{form.pool ? '🏊' : '—'}</span>
            {form.pool ? 'Yes, include pool' : 'No pool'}
          </button>
        </Field>

        <Field label="Architecture Style">
          <Select value={form.style} onChange={set('style')} options={STYLES} />
        </Field>

        <Field label="Interior Style">
          <Select value={form.interiorStyle} onChange={set('interiorStyle')} options={INTERIOR_STYLES} />
        </Field>

        {/* Special features */}
        <Field label="Special Features">
          <div className="flex flex-wrap gap-2">
            {SPECIAL_FEATURES.map((feat) => (
              <button
                key={feat}
                onClick={() => toggleFeature(feat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                            ${
                              form.specialFeatures.includes(feat)
                                ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
              >
                {feat}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Generate button */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white">
        {error && (
          <p className="text-red-500 text-xs mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          onClick={handleGenerate}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                     py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          Generate Layout
        </button>
      </div>
    </aside>
  )
}
