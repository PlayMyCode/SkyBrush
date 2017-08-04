
/**
 * A simple, generic event handler.
 *
 * It's pretty common in UI's that you have a central object
 * that manages the app. This makes the wiring simpler.
 *
 * When something happens in the app, it tells the central
 * object that it's happening. The central object then tells
 * the application components to all update.
 *
 * This is a class for helping to build that model. You can
 * add callbacks to this event handler, and then tell it to
 * run all those callbacks on demand. That way the updates
 * can be easily added, and run, as needed.
 * 
 * You can attach functions, using 'add', and then run them later,
 * using 'context'.
 * 
 * @constructor
 */
export class Handler<C, T> {

  /// Stores our events.
  private readonly events : Map<T, Array<() => void>>

  /// Used as 'this' for when we run events.
  private readonly context : C

  constructor( context:C ) {
    this.events = new Map()
    this.context = context
  }

  /**
   * Adds a new event to store under the 'type'.
   *
   * @param eventType The type of event being stored.
   * @param event The event to store.
   * @return this EventHandler object.
   */
  add( eventType:T, event:() => void ):this {
    const es = this.events.get( eventType )

    if ( ! es ) {
      this.events.set( eventType, [event] )
    } else {
      es.push( event )
    }

    return this
  }

  /**
   * Runs all of the events stored under the type given.
   * Each event is called as if it were run on the 'context' object.
   * 
   * @param eventType The type of events to run.
   * @return this EventHandler object.
   */
  run( eventType:T ) {
    const es = this.events.get( eventType )

    if ( es ) {
      // Convert arguments into an array.
      const esArgs = new Array( arguments.length - 1 )
      for ( let i = 1; i < arguments.length; i++ ) {
        esArgs[i-1] = arguments[i]
      }

      for ( let i = 0; i < es.length; i++ ) {
        es[i].apply( this.context, esArgs )
      }
    }

    return this
  }
}

/**
 * EventRunner timing utility function.
 * 
 * A common design pattern is to run a function repeatedly, using setTimeout,
 * but when you schedule a function to run, all previously waiting functions
 * should be cancelled.
 * 
 * Something like:
 * 
 * const currentWork = null
 * 
 * function run( callback ) {
 *     if ( currentWork !== null ) {
 *      clearTimeout( currentWork )
 *     }
 * 
 *     currentWork = setTimeout( function() {
 *          currentWork = null
 *          callback()
 *     } )
 * }
 * 
 * The idea is that 'runBar' might be called repeatedly,
 * and each time it cancels any existing work,
 * and sets up a new batch of work to be run instead.
 * 
 * If there is no work to be cancelled, then the current work
 * is run anyway.
 * 
 * The EventRunner implements this design pattern.
 * 
 * Usage:
 *     const runner = new EventRunner( timeout )
 *     runner.run( function() {
 *          // do work
 *     } )
 * 
 * If 'run' is called before the previous 'run' was ever called,
 * then the previous 'run' is cancelled, and the new one replaces it.
 * 
 * To clarify, and to help be clear about what this does:
 * 'run' will cancel a timeout for a previously set function,
 * if you call 'run' before that timeout is fired.
 * This is the whole point of this EventRunner.
 * 
 * 'run' can also be cancelled using the 'clear' method,
 * and 'maybeRun' allows you to only set if there is not a function
 * waiting. 'isPending' also allows you to check if a function is set
 * for a timeout, or not.
 * 
 * The time to use for timeouts is set in the constructor.
 */
export class Runner {
  private readonly timeout : number

  private event : number

  /**
   * The timeout paramter is the amount of time the EventRunner should use
   * when it schedules a function to be called.
   * 
   * This is in milliseconds, and it defaults to 0 (run as soon as possible,
   * on the next JS cycle).
   * 
   * @constructor
   * @param timeout The length of time for functions to wait when passed into 'run'.
   */
  constructor( timeout:number ) {
    this.event   = 0
    this.timeout = timeout
  }

  /**
   * Cleares the current function waiting on a timeout.
   * 
   * If no function is waiting, then this silently does nothing.
   * 
   * True or false is returned to tell you if it did or did not
   * need to clear.
   * 
   * @return true if there was an event pending, false if not.
   */
  clear():this {
    clearTimeout( this.event )
    this.event = 0

    return this
  }

  /**
   * 'run' sets up a timeout to run the given function in the future.
   * 
   * If a function is currently waiting on a timeout to be called,
   * then it will be cancelled before the given function is set to be run.
   * 
   * @param f The function to perform in the timeout.
   * @return This object, for method chaining.
   */
  run( f ):this {
    clearTimeout( this.event )

    this.event = setTimeout(() => {
      this.event = 0

      f()
    }, this.timeout )

    return this
  }
}

