package journal.game

import akka.actor._

import scala.collection.mutable.ArrayBuffer

class BattleShipGame(gId: String) extends Actor
{
  private var turn = -2
  private val (rows, cols) = (20, 25)
  private val players = ArrayBuffer[Player]()

  override def receive = {
    case Join(player)        => join(player)
    case Ready(player)       => ready(player)
    case Leave(player)       => leave(player)
    case Move(player, shots) => play(player, shots)
  }

  override def postStop(): Unit = println(s"End game $gId")

  private def join(player: Player) = players += player

  private def ready(player: Player): Unit = {
    turn += 1

    if (turn == 0) {
      playable.notify(Array.empty[Cell], turn = true)
      opponent.notify(Array.empty[Cell], turn = false)
    }
  }

  private def leave(player: Player): Unit = {
    players -= player

    if (players.size == 0) {
      context.parent ! Remove(gId)
      self ! PoisonPill
    }
  }

  private def play(player: Player, shots: Array[Cell]): Unit = {
    if (player == playable && players.size == 2 && validShots(shots)) {
      val hitShot = opponent.inspect(shots)

      swapPlayers()

      playable.notify(hitShot, turn = true)
      opponent.notify(hitShot, turn = false)
    }
  }

  private def validShots(shots: Array[Cell]): Boolean = {
    (shots.size == playable.fleetSize) &&
      shots.forall(shot => (0 <= shot.x && shot.x < cols) && (0 <= shot.y && shot.y < rows))
  }

  private def swapPlayers() = turn = (turn + 1) % 2

  private def playable: Player = players(turn)

  private def opponent: Player = players((turn + 1) % 2)
}
