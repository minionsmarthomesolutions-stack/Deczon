export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nested layouts in Next.js should not include html/body tags
  // They just wrap the children
  return <>{children}</>
}

