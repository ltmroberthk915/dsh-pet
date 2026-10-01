import { describe, it, expect } from 'vitest'
import { isPetAllowed } from './access.ts'
const paired = { get: () => ({ isPairedDevice: () => true }) } as any
function request(headers: object, address='127.0.0.1'): any { return { headers: { host: '127.0.0.1:1234', ...headers }, socket: { remoteAddress: address } } }
describe('pet trust fence', () => {
  it('does not let a paired cookie override cross-origin rejection', () => {
    expect(isPetAllowed(paired, request({ origin:'https://evil.example' }))).toBe(false)
    expect(isPetAllowed(paired, request({ 'sec-fetch-site':'cross-site' }))).toBe(false)
    expect(isPetAllowed(paired, request({ origin:'null' }))).toBe(false)
    expect(isPetAllowed(paired, request({ origin:'http://127.0.0.1:9876' }))).toBe(false)
  })
  it('allows desktop transport and paired same-origin access; rejects unpaired remote access', () => {
    expect(isPetAllowed({} as any, request({}))).toBe(true)
    expect(isPetAllowed(paired, request({host:'phone.example',origin:'https://phone.example'},'192.168.1.4'))).toBe(true)
    expect(isPetAllowed({} as any, request({host:'phone.example'},'192.168.1.4'))).toBe(false)
  })
})
