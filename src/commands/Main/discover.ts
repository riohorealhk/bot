import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Discover extends Command {
  constructor() {
    super("discover", {
      description: (language: Language) =>
        language.get("DISCOVER_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    await message.send("DISCOVER_MESSAGE");
  }
}
