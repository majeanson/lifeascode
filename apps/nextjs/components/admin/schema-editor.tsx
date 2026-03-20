"use client"

import { useEffect, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CustomField, FieldType, SchemaConfigContent, SchemaField, SchemaProfileKey } from '@life-as-code/validators'
import { SCHEMA_PROFILES } from '@life-as-code/validators'
import { Button } from '@life-as-code/ui'

import { useTRPC } from '@/trpc/react'
import { useToastStore } from '@/stores/toast-store'

// ---- Local-state types with stable IDs for React keying ----

type FieldWithId = SchemaField & { _localId: string }
type CustomFieldWithId = CustomField & { _localId: string }

interface LocalSchema {
  requiredFields: FieldWithId[]
  standardFields: FieldWithId[]
  customFields: CustomFieldWithId[]
}

function toLocalSchema(config: SchemaConfigContent): LocalSchema {
  return {
    requiredFields: config.requiredFields.map((f) => ({ ...f, _localId: crypto.randomUUID() })),
    standardFields: config.standardFields.map((f) => ({ ...f, _localId: crypto.randomUUID() })),
    customFields: config.customFields.map((f) => ({ ...f, _localId: crypto.randomUUID() })),
  }
}

function fromLocalField({ _localId: _id, ...rest }: FieldWithId): SchemaField {
  return rest
}

function fromLocalCustomField({ _localId: _id, ...rest }: CustomFieldWithId): CustomField {
  return rest
}

function fromLocalSchema(local: LocalSchema): SchemaConfigContent {
  return {
    requiredFields: local.requiredFields.map(fromLocalField),
    standardFields: local.standardFields.map(fromLocalField),
    customFields: local.customFields.map(fromLocalCustomField),
  }
}

// ---- Field type options ----

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'tags', 'decision-log', 'jira-link']

// ---- Toggle button ----

interface ToggleProps {
  enabled: boolean
  label: string
  onToggle: () => void
}

function Toggle({ enabled, label, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ---- Main component ----

export function SchemaEditor() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const { data, isPending } = useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))
  const mutation = useMutation(trpc.features.admin.updateSchema.mutationOptions())

  const initialized = useRef(false)
  const [localSchema, setLocalSchema] = useState<LocalSchema>({
    requiredFields: [],
    standardFields: [],
    customFields: [],
  })

  const [activeProfile, setActiveProfile] = useState<SchemaProfileKey>('custom')

  // New standard field form state
  const [newStdName, setNewStdName] = useState('')
  const [newStdType, setNewStdType] = useState<FieldType>('text')

  // New custom field form state
  const [newCustName, setNewCustName] = useState('')
  const [newCustType, setNewCustType] = useState<FieldType>('text')
  const [newCustDesc, setNewCustDesc] = useState('')

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true
      setLocalSchema(toLocalSchema(data.config))
    }
  }, [data])

  function applyProfile(key: SchemaProfileKey) {
    const profile = SCHEMA_PROFILES.find((p) => p.key === key)
    if (!profile || !profile.config) {
      setActiveProfile('custom')
      return
    }
    setActiveProfile(key)
    setLocalSchema(toLocalSchema(profile.config))
  }

  function markCustom() {
    setActiveProfile('custom')
  }

  function handleSave() {
    mutation.mutate(
      { config: fromLocalSchema(localSchema) },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.features.admin.getActiveSchema.queryOptions({}).queryKey,
          })
          showToast({ type: 'success', message: 'Schema updated' })
        },
        onError: () => {
          showToast({ type: 'error', message: 'Failed to save schema' })
        },
      },
    )
  }

  // --- Required field handlers ---
  function toggleRequiredField(id: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.map((f) =>
        f._localId === id ? { ...f, enabled: !f.enabled } : f,
      ),
    }))
  }

  // --- Standard field handlers ---
  function toggleStandardField(id: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      standardFields: prev.standardFields.map((f) =>
        f._localId === id ? { ...f, enabled: !f.enabled } : f,
      ),
    }))
  }

  function deleteStandardField(id: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      standardFields: prev.standardFields.filter((f) => f._localId !== id),
    }))
  }

  function addStandardField() {
    if (!newStdName.trim()) return
    markCustom()
    const field: FieldWithId = {
      name: newStdName.trim(),
      stage: 'all',
      type: newStdType,
      enabled: true,
      _localId: crypto.randomUUID(),
    }
    setLocalSchema((prev) => ({
      ...prev,
      standardFields: [...prev.standardFields, field],
    }))
    setNewStdName('')
    setNewStdType('text')
  }

  // --- Custom field handlers ---
  function toggleCustomField(id: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) =>
        f._localId === id ? { ...f, enabled: !f.enabled } : f,
      ),
    }))
  }

  function deleteCustomField(id: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f._localId !== id),
    }))
  }

  function moveCustomField(id: string, direction: 'up' | 'down') {
    const index = localSchema.customFields.findIndex((f) => f._localId === id)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= localSchema.customFields.length) return
    const newFields = [...localSchema.customFields]
    const a = newFields[index]
    const b = newFields[targetIndex]
    if (a === undefined || b === undefined) return
    newFields[index] = b
    newFields[targetIndex] = a
    markCustom()
    setLocalSchema((prev) => ({ ...prev, customFields: newFields }))
  }

  function updateCustomFieldName(id: string, name: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) =>
        f._localId === id ? { ...f, name } : f,
      ),
    }))
  }

  function updateCustomFieldDescription(id: string, description: string) {
    markCustom()
    setLocalSchema((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) =>
        f._localId === id ? { ...f, description: description.trim() || undefined } : f,
      ),
    }))
  }

  function addCustomField() {
    if (!newCustName.trim()) return
    markCustom()
    const field: CustomFieldWithId = {
      name: newCustName.trim(),
      stage: 'all',
      type: newCustType,
      enabled: true,
      description: newCustDesc.trim() || undefined,
      _localId: crypto.randomUUID(),
    }
    setLocalSchema((prev) => ({
      ...prev,
      customFields: [...prev.customFields, field],
    }))
    setNewCustName('')
    setNewCustType('text')
    setNewCustDesc('')
  }

  // ---- Render ----

  if (isPending) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-6 w-36 animate-pulse rounded bg-muted" />
          <div className="h-12 animate-pulse rounded bg-muted" />
          <div className="h-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Schema Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the three-layer schema applied to all feature lifecycle stages.
        </p>
      </div>

      {/* Profile Selector */}
      <section aria-labelledby="profile-selector-heading">
        <h2 id="profile-selector-heading" className="mb-1 text-lg font-semibold">
          Profile
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Start from a preset. Any manual edit switches you to Custom automatically.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SCHEMA_PROFILES.map((profile) => {
            const isActive = activeProfile === profile.key
            return (
              <button
                key={profile.key}
                type="button"
                onClick={() => { applyProfile(profile.key) }}
                className={`rounded border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <div className="text-sm font-semibold">{profile.label}</div>
                <div className="mt-1 text-xs leading-snug">{profile.description}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Required Fields */}
      <section aria-labelledby="required-fields-heading">
        <h2 id="required-fields-heading" className="mb-1 text-lg font-semibold">
          Required Fields
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Required fields cannot be deleted — only disabled.
        </p>
        <ul className="space-y-2">
          {localSchema.requiredFields.map((field) => (
            <li
              key={field._localId}
              className="flex items-center gap-3 rounded border border-border px-4 py-3"
            >
              <span className="flex-1 text-sm font-medium">{field.name}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {field.type}
              </span>
              <Toggle
                enabled={field.enabled}
                label={field.enabled ? `Disable ${field.name}` : `Enable ${field.name}`}
                onToggle={() => { toggleRequiredField(field._localId) }}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Standard Fields */}
      <section aria-labelledby="standard-fields-heading">
        <h2 id="standard-fields-heading" className="mb-3 text-lg font-semibold">
          Standard Fields
        </h2>
        <ul className="mb-4 space-y-2">
          {localSchema.standardFields.map((field) => (
            <li
              key={field._localId}
              className="flex items-center gap-3 rounded border border-border px-4 py-3"
            >
              <span className="flex-1 text-sm font-medium">{field.name}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {field.type}
              </span>
              <Toggle
                enabled={field.enabled}
                label={field.enabled ? `Disable ${field.name}` : `Enable ${field.name}`}
                onToggle={() => { toggleStandardField(field._localId) }}
              />
              <button
                type="button"
                aria-label={`Delete ${field.name}`}
                onClick={() => { deleteStandardField(field._localId) }}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Field name"
            value={newStdName}
            onChange={(e) => { setNewStdName(e.target.value) }}
            className="flex-1 rounded border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={newStdType}
            onChange={(e) => { setNewStdType(e.target.value as FieldType) }}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Button type="button" onClick={addStandardField} disabled={!newStdName.trim()}>
            Add field
          </Button>
        </div>
      </section>

      {/* Custom Extension Fields */}
      <section aria-labelledby="custom-fields-heading">
        <h2 id="custom-fields-heading" className="mb-3 text-lg font-semibold">
          Custom Extension Fields
        </h2>
        <ul className="mb-4 space-y-3">
          {localSchema.customFields.map((field, i) => (
            <li
              key={field._localId}
              className="space-y-2 rounded border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={field.name}
                  aria-label="Field name"
                  onChange={(e) => { updateCustomFieldName(field._localId, e.target.value) }}
                  className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {field.type}
                </span>
                <Toggle
                  enabled={field.enabled}
                  label={field.enabled ? `Disable ${field.name}` : `Enable ${field.name}`}
                  onToggle={() => { toggleCustomField(field._localId) }}
                />
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => { moveCustomField(field._localId, 'up') }}
                  disabled={i === 0}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => { moveCustomField(field._localId, 'down') }}
                  disabled={i === localSchema.customFields.length - 1}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${field.name}`}
                  onClick={() => { deleteCustomField(field._localId) }}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={field.description ?? ''}
                aria-label="Field description (optional)"
                placeholder="Description (optional — shown as hint in wizard)"
                onChange={(e) => { updateCustomFieldDescription(field._localId, e.target.value) }}
                className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Field name"
              value={newCustName}
              onChange={(e) => { setNewCustName(e.target.value) }}
              className="flex-1 rounded border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={newCustType}
              onChange={(e) => { setNewCustType(e.target.value as FieldType) }}
              className="rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newCustDesc}
            onChange={(e) => { setNewCustDesc(e.target.value) }}
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button type="button" onClick={addCustomField} disabled={!newCustName.trim()}>
            Add custom field
          </Button>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Schema'}
        </Button>
      </div>
    </div>
  )
}
