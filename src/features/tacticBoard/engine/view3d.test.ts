import { describe, expect, it } from 'vitest'
import { NET_Y } from './court'
import { blockHandHeight, contactHeight, eyeHeight, jumpFor, parseHslToken, toWorld } from './view3d'

describe('3D view numbers', () => {
  it('puts the net at Z = 0 with our side positive', () => {
    expect(toWorld({ x: 4.5, y: NET_Y })).toEqual([0, 0, 0])
    expect(toWorld({ x: 0, y: 18 }, 1)).toEqual([-4.5, 1, 9])
  })

  it('gets bigger blockers higher over the net, and lower over a women\'s net', () => {
    expect(blockHandHeight('large', 'men')).toBeGreaterThan(blockHandHeight('medium', 'men'))
    expect(blockHandHeight('medium', 'men')).toBeGreaterThan(blockHandHeight('small', 'men'))
    expect(blockHandHeight('medium', 'women')).toBeLessThan(blockHandHeight('medium', 'men'))
    expect(contactHeight('men')).toBeGreaterThan(blockHandHeight('large', 'men'))
  })

  it('jumps only as much as the reach needs', () => {
    expect(jumpFor('medium', 1)).toBe(0)
    expect(jumpFor('small', blockHandHeight('small', 'men'))).toBeGreaterThan(0)
  })

  it('crouches below standing eye height', () => {
    expect(eyeHeight('medium', 'crouch')).toBeLessThan(eyeHeight('medium', 'stand'))
  })

  it('reads board colour tokens', () => {
    expect(parseHslToken(' 0 80% 52% / 0.42')).toEqual({ color: 'hsl(0, 80%, 52%)', opacity: 0.42 })
    expect(parseHslToken('205 50% 52%')).toEqual({ color: 'hsl(205, 50%, 52%)', opacity: 1 })
  })
})
