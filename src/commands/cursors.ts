
import { Command } from 'commands/command'

export const CIRCLE_CURSOR = ( command:Command ) => {
  command.setCircle( command.getSize() )
}

export const SQUARE_CURSOR = ( command:Command ) => {
  command.setSquare( command.getSize() )
}

