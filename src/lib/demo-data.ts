// Datos de demostración — no son datos reales.
export type Task = { id: string; title: string; space: string; due: string; status: string; owner: string; link?: string };

export const tasks: Task[] = [
  { id: "t1", title: "Aprobar carrusel campaña Otoño — Café Mar", space: "Agencia", due: "Hoy 12:00", status: "Revisión", owner: "Bismarck", link: "/agencia" },
  { id: "t2", title: "Mezcla v4 de «Medianoche» con notas del productor", space: "Música", due: "Hoy 16:00", status: "En curso", owner: "Leo Ruiz", link: "/musica" },
  { id: "t3", title: "Guion reel: 3 errores al lanzar tu marca", space: "Marca personal", due: "Mañana", status: "Borrador", owner: "Bismarck", link: "/marca" },
  { id: "t4", title: "Enviar propuesta Q1 a Grupo Norte", space: "Clientes", due: "Lun 3", status: "En curso", owner: "Ana Paz", link: "/clientes" },
  { id: "t5", title: "Subir metadatos y arte a distribuidora", space: "Música", due: "Mar 4", status: "Bloqueado", owner: "Bismarck", link: "/musica" },
  { id: "t6", title: "Factura #0142 Café Mar", space: "Finanzas", due: "Vie 7", status: "Listo", owner: "Ana Paz", link: "/finanzas" },
  { id: "t7", title: "Investigar tendencias TikTok música latina", space: "Investigación", due: "Vie 7", status: "En curso", owner: "Donna", link: "/investigacion" },
  { id: "t8", title: "Programar 5 posts semana 45", space: "Publishing", due: "Dom 9", status: "Programado", owner: "Donna", link: "/publishing" },
];

export const agenda = [
  { time: "09:30", title: "Daily equipo agencia", where: "Meet" },
  { time: "11:00", title: "Revisión creativa Café Mar", where: "Estudio" },
  { time: "14:00", title: "Sesión de voz «Medianoche»", where: "Estudio B" },
  { time: "18:00", title: "Grabación contenido marca", where: "Casa" },
];

export const clients = [
  { name: "Café Mar", status: "Activo", campaigns: 3, mrr: 2400, health: 92 },
  { name: "Grupo Norte", status: "Propuesta", campaigns: 0, mrr: 0, health: 60 },
  { name: "Lumen Studio", status: "Activo", campaigns: 2, mrr: 1800, health: 78 },
  { name: "Ola Fitness", status: "Pausado", campaigns: 1, mrr: 900, health: 45 },
];

export const tracks = [
  { title: "Medianoche", version: "v4", status: "En curso", updated: "hace 2 h", collab: ["Leo Ruiz", "Bismarck G", "Mía Sol"], bpm: 92, key: "Am" },
  { title: "Agua Salada", version: "v7", status: "Listo", updated: "ayer", collab: ["Bismarck G", "Nico V"], bpm: 104, key: "F#m" },
  { title: "Luz de Neón", version: "v2", status: "Revisión", updated: "hace 3 d", collab: ["Mía Sol"], bpm: 120, key: "C" },
  { title: "Volver", version: "v1", status: "Borrador", updated: "hace 1 sem", collab: ["Bismarck G"], bpm: 78, key: "Dm" },
];

export const releaseChecklist = [
  { item: "Master final aprobado", done: true },
  { item: "Arte 3000×3000", done: true },
  { item: "Metadatos y créditos", done: false },
  { item: "ISRC asignado", done: false },
  { item: "Subida a distribuidora", done: false },
  { item: "Pitch a playlists", done: false },
];

export const posts = [
  { day: 0, time: "09:00", channel: "Instagram", title: "Carrusel Otoño", status: "Programado", tone: "orange" },
  { day: 1, time: "12:00", channel: "TikTok", title: "Teaser Medianoche", status: "Borrador", tone: "lavender" },
  { day: 2, time: "18:00", channel: "LinkedIn", title: "Caso Lumen", status: "Programado", tone: "blue" },
  { day: 3, time: "10:00", channel: "Instagram", title: "Reel 3 errores", status: "Revisión", tone: "mint" },
  { day: 4, time: "20:00", channel: "YouTube", title: "Detrás de cámaras", status: "Programado", tone: "olive" },
  { day: 5, time: "11:00", channel: "X", title: "Hilo lanzamiento", status: "Borrador", tone: "cream" },
] as const;

export const assets = [
  { name: "Logo Café Mar", type: "SVG", collection: "Café Mar", tone: "orange" },
  { name: "Foto producto 01", type: "JPG", collection: "Café Mar", tone: "cream" },
  { name: "Portada Medianoche", type: "PNG", collection: "Música", tone: "gradient" },
  { name: "Plantilla reel", type: "MP4", collection: "Marca", tone: "lavender" },
  { name: "Paleta Lumen", type: "PDF", collection: "Lumen", tone: "mint" },
  { name: "Guía de marca", type: "PDF", collection: "Lumen", tone: "blue" },
  { name: "Stems Agua Salada", type: "ZIP", collection: "Música", tone: "olive" },
  { name: "Brief Otoño", type: "DOC", collection: "Café Mar", tone: "dark" },
] as const;

export const finances = {
  income: 18450, expenses: 7320, pending: 4200, growth: 18.4,
  monthly: [42, 55, 38, 61, 70, 48, 66, 74, 59, 81, 77, 92],
  invoices: [
    { id: "#0142", client: "Café Mar", amount: 2400, status: "Listo" },
    { id: "#0143", client: "Lumen Studio", amount: 1800, status: "En curso" },
    { id: "#0144", client: "Ola Fitness", amount: 900, status: "Bloqueado" },
  ],
};

export const research = [
  { title: "Tendencias TikTok música latina 2026", sources: 14, findings: 6, status: "En curso" },
  { title: "Competencia agencias boutique", sources: 9, findings: 4, status: "Listo" },
  { title: "Precios distribución digital", sources: 6, findings: 3, status: "Revisión" },
];

export const notes = [
  { text: "Idea: serie «un día en el estudio» para marca personal", tag: "Sin clasificar" },
  { text: "Llamar a Leo por créditos de Medianoche", tag: "Música" },
  { text: "Café Mar quiere probar formato UGC", tag: "Agencia" },
  { text: "Revisar suscripciones de software", tag: "Finanzas" },
];
