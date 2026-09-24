import './RowActions.css'

function RowActionIcon({ name }) {
  const paths = {
    view: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    status: <><path d="M8 12l3 3 6-7" /><path d="M21 12a9 9 0 1 1-9-9" /></>,
    delete: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function RowActionButton({ type, label, onClick, disabled }) {
  return <button type="button" className={`row-action-button ${type}`} aria-label={label} title={label} onClick={onClick} disabled={disabled || !onClick}><RowActionIcon name={type} /></button>
}

export default function RowActions({ itemName = 'record', isActive = true, onView, onEdit, onStatus, onDelete, statusDisabled = false }) {
  const statusLabel = isActive ? `Deactivate ${itemName}` : `Activate ${itemName}`
  return <span className="row-actions" aria-label="Row actions"><RowActionButton type="view" label={`View ${itemName}`} onClick={onView} /><RowActionButton type="edit" label={`Edit ${itemName}`} onClick={onEdit} /><RowActionButton type="status" label={statusLabel} onClick={onStatus} disabled={statusDisabled} /><RowActionButton type="delete" label={`Delete ${itemName}`} onClick={onDelete} /></span>
}