// Adapted from github.com/jamiefaye/downrush/blob/master/xmlView/src/FmtSound.js by Jamie Fenton
// Also see https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit

/**
 * A number between 0 and 50. Used in most deluge values.
 */
export class FixPos50 {
  private _fixh: string
  private _decimal: number

  constructor(value: string) {
    this._fixh = value
    let v = parseInt(value, 16)
    if (v & 0x80000000) {
      v -= 0x100000000
    }
    this._decimal = Math.round(((v + 0x80000000) * 50) / 0x100000000)
  }

  public get decimal() {
    return this._decimal
  }

  public get fixh() {
    return this._fixh
  }
}