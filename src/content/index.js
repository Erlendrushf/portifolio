const modules = import.meta.glob('./projects/*.json', { eager: true, import: 'default' })

export const projects = Object.values(modules).sort((a, b) => a.title.localeCompare(b.title))
