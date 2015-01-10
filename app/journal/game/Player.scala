package journal.game

import akka.actor.ActorRef

import play.api.libs.json._
import play.api.libs.functional.syntax._
import play.api.libs.iteratee.Concurrent.Channel
import play.api.libs.iteratee.{Enumerator, Iteratee}

case class Play(id: String)
case class Remove(id: String)
case class Join(player: Player)
case class Cell(x: Int, y: Int)
case class Ready(player: Player)
case class Leave(player: Player)
case class Move(player: Player, shots: Array[Cell])

case class Ship(body: Array[Cell])
{
  def isHit(shot: Cell): Boolean = body.contains(shot)
}
case class Battle(game: ActorRef, inhabitation: Int)
case class Pipe(in: Iteratee[JsValue, _], out: Enumerator[JsValue])

object Encoders
{
  implicit val cellEncoder = new Writes[Cell] {
    def writes(c: Cell) = Json.obj(
      "x" -> JsNumber(c.x),
      "y" -> JsNumber(c.y)
    )
  }

  implicit val shipEncoder = new Writes[Ship] {
    def writes(ship: Ship) = Json.obj(
      "body" -> Json.toJson(ship.body)
    )
  }
}

object Decoders
{
  implicit val cellDecoder: Reads[Cell] = (
    (JsPath \ "x").read[Int]
      and
    (JsPath \ "y").read[Int]
  )(Cell.apply _)

  implicit val shipDecoder: Reads[Ship] = (JsPath \ "body").read[Array[Cell]].map(Ship.apply)
}

class Player(out: Channel[JsValue], game: ActorRef)
{
  import journal.game.Decoders._
  import journal.game.Encoders._

  private var fleet: Array[Ship] = Array.empty[Ship]

  def fleetSize = fleet.size

  def handle(msg: JsValue): Unit = {
    msg.asOpt[Array[Ship]] match {
      case None =>
        // Do nothing
      case Some(ships) =>
        fleet = ships
        game ! Ready(this)
    }

    (msg \ "shots").asOpt[Array[Cell]] match {
      case None =>
        // Do nothing
      case Some(shots) =>
        game ! Move(this, shots)
    }
  }

  def inspect(shots: Array[Cell]): Array[Cell] = {
    val (hit, misses) = fleet.partition(ship => shots.exists(ship.isHit))
    fleet = misses

    shots.filter(shot => hit.exists(_.isHit(shot)))
  }

  def notify(shots: Array[Cell], turn: Boolean): Unit = {
    out.push(
      Json.obj(
        "turn" -> Json.toJson(turn),
        "shot" -> Json.toJson[Array[Cell]](shots)
      )
    )
  }
}
