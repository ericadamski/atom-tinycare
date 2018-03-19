"use babel";

import { CompositeDisposable } from "atom";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { delay, takeUntil } from "rxjs/operators";
import { Tinycare, emitCanStartTimer, emitBreakTaken } from "tinycare";
import "rxjs/add/observable/of";
import "rxjs/add/operator/do";

function dev(fn) {
  return function(...args) {
    return atom.inDevMode() && fn.apply(null, args);
  };
}

const log = dev(console.log);

export default {
  config: {
    twitter_consumer_key: {
      type: "string",
      default: "",
      description: "Twitter Consumer Key (API Key)",
      title: "Consumer Key"
    },
    twitter_consumer_secret: {
      type: "string",
      default: "",
      description: "Twitter Consumer Secret (API Secret)",
      title: "Consumer Secret"
    },
    twitter_access_token: {
      type: "string",
      default: "",
      description: "Twitter Access Token",
      title: "Access Token"
    },
    twitter_access_token_secret: {
      type: "string",
      default: "",
      description: "Twitter Access Token Secret",
      title: "Access Token Secret"
    },
    break_time: {
      type: "number",
      default: 1,
      minimum: 1,
      description: "The amount of minutes that constitues a break.",
      title: "Length of Break"
    }
  },

  activate() {
    log('Congratulations, your extension "tinycare" is now active!');

    const config = Object.assign(
      {},
      atom.config.defaultSettings.tinycare,
      atom.config.settings.tinycare
    );
    const open$ = new Subject();

    try {
      Tinycare({
        twitter: {
          consumerKey: config.twitter_consumer_key,
          consumerSecret: config.twitter_consumer_secret,
          accessToken: config.twitter_access_token,
          accessSecret: config.twitter_access_token_secret
        },
        onCareNotification: ({ text: message, bot }) =>
          atom.notifications.addInfo(bot, { detail: message })
      });
    } catch (e) {
      atom.notifications.addError(
        "You may be missing some of the Twitter configuration.",
        {
          detail: "Please open up the settings and add your keys."
        }
      );
    }

    atom.workspace.onDidOpen(() => {
      open$.next(atom.workspace.getTextEditors().length);

      emitCanStartTimer(
        (log("emitCanStartTimer"), atom.workspace.getTextEditors().length > 0)
      );
    });

    atom.workspace.observeActiveTextEditor(current => {
      log(
        `Changed active document. Now have: ${
          atom.workspace.getTextEditors().length
        } open document(s).`
      );

      atom.workspace.getTextEditors().length === 1 &&
        !current &&
        Observable.of(() => (log("Break Taken!"), emitBreakTaken(true)))
          .pipe(delay(config.break_time * (60 * 1000)))
          .pipe(
            takeUntil(
              open$.do(count => log(`Cancelling with ${count} open editors`))
            )
          )
          .subscribe(fn => fn());
    });
  }
};
