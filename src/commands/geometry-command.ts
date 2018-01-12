
import { Command, CommandOptions } from './command'

export class GeometryCommand extends Command {

  protected isFilled = false
  protected size = 1

  /**
   * Commands for drawing geometry.
   *
   * For the setup, it adds the properties:
   *
   *  = onDraw - called for drawing geometry
   *  = onDown - already exists, but is wrapped in it's own onDown
   *
   * @constructor
   * @private
   *
   * @param setup The controls information for this command.
   */
  constructor( setup:CommandOptions ) {
    this.startX = 0
    this.startY = 0

    this.isFilled = true
    this.size = 1

    this.isAliased = false

    this.drawGeom = setup.onDraw

    const oldOnDown = setup.onDown
    setup.onDown = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.startX = x,
      this.startY = y
      this.lastX = x
      this.lastY = y

      canvas.getContext().lineJoin = 'miter'

      if ( oldOnDown ) {
        oldOnDown.call( this, canvas, x, y )
      }
    }

    setup.onMove = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }

    setup.onUp = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.setDrawArea( this.startX, this.startY, x-this.startX, y-this.startY, this.size )

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }

    setup.cursor = constants.DEFAULT_CURSOR

    super( setup )
  }

  round( n:number, isOutline:boolean, size:number ) {
    if ( (!isOutline) || size % 2 === 0 ) {
      return n | 0
    } else {
      return (n | 0) + 0.5
    }
  }

  toggleAliased() {
    this.isAliased = ! this.isAliased
  }

  toggleFilled() {
    this.isFilled = ! this.isFilled
  }
}

