package journal.game

import akka.actor.{ActorRef, Props, Actor}

import play.api.libs.json.JsValue
import play.api.libs.iteratee.{Iteratee, Concurrent}

import scala.concurrent.ExecutionContext.Implicits.global

class BattleManager extends Actor
{
  val battleQueue = new scala.collection.mutable.HashMap[String, Battle]()

  override def receive: Receive = {
    case Play(bId) =>
      battleQueue.get(bId) match {
        case None =>
          val game = context.actorOf(Props(new BattleShipGame(bId)))

          battleQueue += (bId -> Battle(game, 1))
          regPlayer(game, sender())

        case Some(Battle(game, inhabitation)) if inhabitation < 2 =>
          battleQueue += (bId -> Battle(game, inhabitation + 1))
          regPlayer(game, sender())

        case _ =>
          sender() ! None

      }

    case Remove(id) =>
      battleQueue -= id

  }

  private def regPlayer(game: ActorRef, notifier: ActorRef) = {
    val (out, channel) = Concurrent.broadcast[JsValue]
    val player = new Player(channel, game)

    game ! Join(player)

    val in = Iteratee.foreach[JsValue](player.handle)
                     .map(_ => game ! Leave(player))

    notifier ! Pipe(in, out)
  }
}
