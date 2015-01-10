package controllers

import play.api.mvc._
import play.api.libs.json._
import play.api.libs.iteratee.{Enumerator, Iteratee}

import java.util.UUID

import akka.actor._
import akka.pattern.ask
import akka.util.Timeout

import scala.concurrent.Await
import scala.concurrent.duration._

import journal.game.{Pipe, Play, BattleManager}

object Application extends Controller
{
  val gameSystem = ActorSystem("game")
  val gameManager = gameSystem.actorOf(Props(classOf[BattleManager]))

  def index = Action { request =>
    Ok(views.html.index("Your new application is ready."))
  }

  def initBattle(bId: Option[String]) = Action { request =>
    bId match {
      case None =>
        Redirect(s"/battle?id=${UUID.randomUUID().toString.replace("-", "")}")
      case Some(id) =>
        Ok(views.html.game(s"ws://${request.headers("Host")}/battle/ws/$id"))
    }
  }

  def battleWS(bId: String) = WebSocket.using[JsValue] { request =>
    implicit val timeout = Timeout.apply(5 seconds)

    Await.result(gameManager ? Play(bId), timeout.duration) match {
      case Pipe(in, out) => (in, out)
      case None => (Iteratee.ignore[JsValue], Enumerator().andThen(Enumerator.eof))
    }
  }
}