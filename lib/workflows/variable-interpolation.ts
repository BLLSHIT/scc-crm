export function interpolate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key) && context[key] != null) {
      return String(context[key])
    }
    return match
  })
}
