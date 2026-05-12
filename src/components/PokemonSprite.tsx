import { useState } from 'react'

interface Props {
  src: string | null
  name: string
  size?: number
}

export function PokemonSprite({ src, name, size = 40 }: Props) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 4,
        background: '#181828',
      }} />
    )
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, imageRendering: 'auto' }}
      onError={() => setErrored(true)}
    />
  )
}
