import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
    Plus, Pencil, Trash2, Search, X, Check, AlertCircle,
    UserPlus, Loader2, Printer,
} from 'lucide-react'

// ─── Formatters ────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val ?? 0)

// ─── Print ticket ──────────────────────────────────────────────────────────────
// Injects raw HTML into #seccion-ticket (a real DOM node outside React),
// then calls window.print(). This avoids the inline-style specificity problem.

function buildTicketHTML(cliente, ultimoAporte = 0) {
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const logoSrc = `${window.location.origin}/mariposa.png`
    const saldo = new Intl.NumberFormat('es-PE', {
        style: 'currency', currency: 'PEN',
    }).format(cliente.ahorro_acumulado ?? 0)

    return /* html */`
    <div style="width: 100%; margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000;">
  <div style="display: block; padding-top: 0px;">
    
    <div style="display:flex; align-items:center; gap:8px; margin-top: 0;">
      <img
        src="${logoSrc}"
        alt="Logo"
        style="width:45px; height:45px; object-fit:contain;"
      />
      <div style="line-height:1.1;">
        <div style="font-weight:bold; font-size:18px;">Creciendo juntos</div>
        <div style="font-weight:bold; font-size:18px;">#DIOSAQUI</div>
      </div>
    </div>

    <div style="border-top:1px dashed #000; margin:4px 0;"></div>

    <div style="font-size:13px; margin-bottom:2px;">
      <strong>Fecha:</strong> ${fecha} &nbsp; <strong>Hora:</strong> ${hora}
    </div>

    <div style="font-size:13px; margin-bottom:2px;">
      <strong>Cliente:</strong> ${cliente.nombre_completo}
    </div>
    <div style="font-size:13px; margin-bottom:4px;">
      <strong>DNI:</strong> ${cliente.dni}
    </div>

    <div style="border-top:1px dashed #000; margin:4px 0;"></div>

    <div style="font-size:13px; margin: 4px 0; font-weight: bold;">
      Aporte: S/ ${ultimoAporte}
    </div>

    <div style="border-top:1px dashed #000; margin:4px 0;"></div>

    <div style="text-align:center; margin:8px 0;">
      <div style="font-size:12px; font-weight:bold; margin-bottom:2px;">
        SALDO TOTAL ACUMULADO
      </div>
      <div style="font-size:24px; font-weight:bold; border: 1px solid #000; padding: 4px; display: inline-block;">
        ${saldo}
      </div>
    </div>

    <div style="border-top:1px dashed #000; margin:4px 0;"></div>

    <div style="text-align:center; font-size:12px; margin-top:4px; font-style:italic;">
      Gracias por su confianza
    </div>
  </div>
</div>
  `
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(onClose, 3500)
        return () => clearTimeout(t)
    }, [toast, onClose])

    if (!toast) return null
    const isError = toast.type === 'error'

    return (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${isError ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
            {isError ? <AlertCircle size={16} /> : <Check size={16} />}
            {toast.message}
        </div>
    )
}

// ─── Modal base ────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    )
}

// ─── Form field ────────────────────────────────────────────────────────────────

function Field({ label, ...props }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <input
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900
          placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                {...props}
            />
        </div>
    )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Clientes() {
    const [operacionTemporal, setOperacionTemporal] = useState({ clienteId: null, monto: 0 })
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState(null)

    const [nuevoModal, setNuevoModal] = useState(false)
    const [editModal, setEditModal] = useState(null)
    const [ahorroModal, setAhorroModal] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const [formNombre, setFormNombre] = useState('')
    const [formDni, setFormDni] = useState('')
    const [formMonto, setFormMonto] = useState('')
    const [saving, setSaving] = useState(false)

    const showToast = (message, type = 'success') => setToast({ message, type })

    function handlePrint(cliente) {
        const el = document.getElementById('seccion-ticket')
        if (!el) return

        const montoAImprimir = operacionTemporal.clienteId === cliente.id ? operacionTemporal.monto : 0
        el.innerHTML = buildTicketHTML(cliente, montoAImprimir)

        // Small delay to ensure the DOM update is painted before the print dialog opens
        setTimeout(() => {
            window.print()
            window.addEventListener('afterprint', () => {
                el.innerHTML = ''
            }, { once: true })
        }, 100)
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────────

    const fetchClientes = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('clientes')
            .select('id, nombre_completo, dni, ahorro_acumulado')
            .order('nombre_completo', { ascending: true })

        if (error) showToast('Error al cargar clientes: ' + error.message, 'error')
        else setClientes(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchClientes() }, [fetchClientes])

    // ── Search ────────────────────────────────────────────────────────────────────

    const filtered = clientes.filter((c) => {
        const q = search.toLowerCase()
        return c.nombre_completo?.toLowerCase().includes(q) || c.dni?.toLowerCase().includes(q)
    })

    // ── Nuevo cliente ─────────────────────────────────────────────────────────────

    const openNuevo = () => { setFormNombre(''); setFormDni(''); setNuevoModal(true) }

    const handleNuevo = async (e) => {
        e.preventDefault(); setSaving(true)
        const { error } = await supabase.from('clientes')
            .insert({ nombre_completo: formNombre.trim(), dni: formDni.trim(), ahorro_acumulado: 0 })
        if (error) showToast('Error al crear cliente: ' + error.message, 'error')
        else { showToast('Cliente registrado correctamente'); setNuevoModal(false); fetchClientes() }
        setSaving(false)
    }

    // ── Editar cliente ────────────────────────────────────────────────────────────

    const openEdit = (c) => { setFormNombre(c.nombre_completo); setFormDni(c.dni); setEditModal(c) }

    const handleEdit = async (e) => {
        e.preventDefault(); setSaving(true)
        const { error } = await supabase.from('clientes')
            .update({ nombre_completo: formNombre.trim(), dni: formDni.trim() })
            .eq('id', editModal.id)
        if (error) showToast('Error al actualizar: ' + error.message, 'error')
        else { showToast('Cliente actualizado correctamente'); setEditModal(null); fetchClientes() }
        setSaving(false)
    }

    // ── Aumentar ahorro ───────────────────────────────────────────────────────────

    const openAhorro = (c) => { setFormMonto(''); setAhorroModal(c) }

    const handleAhorro = async (e) => {
        e.preventDefault()
        const monto = parseFloat(formMonto)
        if (isNaN(monto) || monto <= 0) { showToast('Ingresa un monto válido mayor a 0', 'error'); return }
        setSaving(true)
        const nuevoTotal = (ahorroModal.ahorro_acumulado ?? 0) + monto
        const { error } = await supabase.from('clientes')
            .update({ ahorro_acumulado: nuevoTotal })
            .eq('id', ahorroModal.id)
        if (error) showToast('Error al actualizar ahorro: ' + error.message, 'error')
        else {
            setOperacionTemporal({ clienteId: ahorroModal.id, monto: monto })
            showToast(`Se sumaron ${formatCurrency(monto)} al ahorro`)
            setAhorroModal(null)
            fetchClientes()
        }
        setSaving(false)
    }

    // ── Eliminar cliente ──────────────────────────────────────────────────────────

    const handleDelete = async () => {
        setSaving(true)
        const { error } = await supabase.from('clientes').delete().eq('id', deleteTarget.id)
        if (error) showToast('Error al eliminar: ' + error.message, 'error')
        else { showToast('Cliente eliminado'); setDeleteTarget(null); fetchClientes() }
        setSaving(false)
    }

    // ─────────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
                <button
                    onClick={openNuevo}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                    <UserPlus size={16} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:max-w-sm pl-9 pr-9 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 sm:right-[calc(100%-20rem+0.75rem)] text-slate-400 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Cargando clientes...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm">
                        {search ? 'No se encontraron resultados para tu búsqueda.' : 'Aún no hay clientes registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 tracking-wide text-xs uppercase">Nombre</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 tracking-wide text-xs uppercase">DNI</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-slate-600 tracking-wide text-xs uppercase">Ahorro Acumulado</th>
                                    <th className="px-5 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-medium text-slate-800">{cliente.nombre_completo}</td>
                                        <td className="px-5 py-4 text-slate-600 font-mono">{cliente.dni}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="font-semibold text-emerald-700">
                                                {formatCurrency(cliente.ahorro_acumulado)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Imprimir ticket */}
                                                <button
                                                    onClick={() => handlePrint(cliente)}
                                                    title="Imprimir ticket"
                                                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                {/* Aumentar ahorro */}
                                                <button
                                                    onClick={() => openAhorro(cliente)}
                                                    title="Aumentar ahorro"
                                                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                                {/* Editar */}
                                                <button
                                                    onClick={() => openEdit(cliente)}
                                                    title="Editar cliente"
                                                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                {/* Eliminar */}
                                                <button
                                                    onClick={() => setDeleteTarget(cliente)}
                                                    title="Eliminar cliente"
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer count */}
            {!loading && clientes.length > 0 && (
                <p className="text-xs text-slate-400 mt-3 px-1">
                    {filtered.length} de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* ── Modals ──────────────────────────────────────────────────────────────── */}

            <Modal open={nuevoModal} onClose={() => setNuevoModal(false)} title="Nuevo Cliente">
                <form onSubmit={handleNuevo}>
                    <Field label="Nombre completo" type="text" placeholder="Ej. María García Torres" required value={formNombre} onChange={(e) => setFormNombre(e.target.value)} />
                    <Field label="DNI" type="text" placeholder="Ej. 12345678" required value={formDni} onChange={(e) => setFormDni(e.target.value)} />
                    <div className="flex gap-2 mt-5">
                        <button type="button" onClick={() => setNuevoModal(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-700 disabled:opacity-60 transition-colors">
                            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Registrar'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar Cliente">
                <form onSubmit={handleEdit}>
                    <Field label="Nombre completo" type="text" required value={formNombre} onChange={(e) => setFormNombre(e.target.value)} />
                    <Field label="DNI" type="text" required value={formDni} onChange={(e) => setFormDni(e.target.value)} />
                    <div className="flex gap-2 mt-5">
                        <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal open={!!ahorroModal} onClose={() => setAhorroModal(null)} title="Aumentar Ahorro">
                {ahorroModal && (
                    <form onSubmit={handleAhorro}>
                        <p className="text-sm text-slate-500 mb-1">Cliente: <span className="font-medium text-slate-800">{ahorroModal.nombre_completo}</span></p>
                        <p className="text-sm text-slate-500 mb-4">Ahorro actual: <span className="font-semibold text-emerald-700">{formatCurrency(ahorroModal.ahorro_acumulado)}</span></p>
                        <Field label="Monto a agregar (S/)" type="number" step="0.01" min="0.01" placeholder="0.00" required value={formMonto} onChange={(e) => setFormMonto(e.target.value)} />
                        <div className="flex gap-2 mt-5">
                            <button type="button" onClick={() => setAhorroModal(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar Cliente">
                {deleteTarget && (
                    <div>
                        <div className="flex items-start gap-3 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">
                                ¿Estás seguro de que deseas eliminar a <span className="font-semibold">{deleteTarget.nombre_completo}</span>? Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
                                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    )
}
