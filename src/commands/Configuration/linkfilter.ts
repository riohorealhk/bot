import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

const valid = [
  "discord",
  "paypal",
  "youtube",
  "twitch",
  "twitter",
  "shorteners",
];

export default class LinkFilter extends Command {
  constructor() {
    super("linkfilter", {
      description: (language: Language) =>
        language.get("LINKFILTER_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "filters",
          type: valid,
          readableType: "filters",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      filters:
        | "discord"
        | "paypal"
        | "youtube"
        | "twitch"
        | "twitter"
        | "shorteners";
    }
  ) {
    if (!args.filters || !valid.includes(args.filters))
      return await message.error("LINKFILTER_FILTER_LIST", valid);
    else {
      let current: string[] = message.guild.settings.get("mod.linkfilter", []);
      const filter = args.filters;
      if (current.includes(filter))
        current = current.filter((f) => f != filter && valid.includes(f));
      else current.push(filter);
      message.guild.settings.set("mod.linkfilter", current);
      return await message.success(
        current.length ? "LINKFILTER_SET" : "LINKFILTER_RESET",
        current
      );
    }
  }
}
