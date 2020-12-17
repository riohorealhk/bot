import {
  APIMessageContentResolvable,
  GuildMemberResolvable,
  AwaitMessagesOptions,
  MessageEditOptions,
  MessageResolvable,
  MessageAttachment,
  StringResolvable,
  MessageAdditions,
  CollectorFilter,
  MessageMentions,
  MessageReaction,
  RoleResolvable,
  MessageOptions,
  MessageManager,
  MessageEmbed,
  TextChannel,
  NewsChannel,
  APIMessage,
  Collection,
  Snowflake,
  Message,
} from "discord.js";
import { SlashCommand } from "../interfaces/slashCommands";
import { ArgumentOptions, Command } from "../util/command";
import { CommandUtil } from "../util/commandutil";
import { constants } from "../util/constants";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis, reactions } = constants;

export class SlashCommandMessage {
  id: string;
  client: Fire;
  flags: number;
  sent: boolean;
  content: string;
  command: Command;
  author: FireUser;
  guild?: FireGuild;
  util: CommandUtil;
  language: Language;
  member?: FireMember;
  channel: FakeChannel;
  latestResponse: string;
  mentions: MessageMentions;
  slashCommand: SlashCommand;
  realChannel?: TextChannel | NewsChannel;
  attachments: Collection<string, MessageAttachment>;

  constructor(client: Fire, command: SlashCommand) {
    this.client = client;
    this.id = command.id;
    this.slashCommand = command;
    if (command.data.options?.length && command.data.options[0]?.options) {
      command.data.name = `${command.data.name}-${command.data.options[0].name}`;
      command.data.options = command.data.options[0].options;
    }
    this.command = this.client.getCommand(command.data.name);
    this.flags = 0;
    if (this.command?.ephemeral) this.setFlags(64);
    this.guild = client.guilds.cache.get(command.guild_id) as FireGuild;
    // @ts-ignore
    this.mentions = new MessageMentions(this, [], [], false);
    this.attachments = new Collection();
    this.author =
      (client.users.cache.get(command.member.user.id) as FireUser) ||
      new FireUser(client, command.member.user);
    if (!client.users.cache.has(this.author.id))
      client.users.add(command.member.user);
    if (this.guild) {
      this.member =
        (this.guild.members.cache.get(this.author.id) as FireMember) ||
        new FireMember(client, command.member, this.guild);
      if (!this.guild.members.cache.has(this.member.id))
        this.guild.members.add(command.member);
    }
    this.language = this.author?.settings.get("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || client.getLanguage("en-US");
    if (!this.guild) {
      // this should only happen if a guild authorizes slash commands
      // but doesn't have the bot. INTERACTION_CREATE will give an error
      // if the guild is necessary
      this.channel = new FakeChannel(
        this,
        client,
        command.id,
        command.token,
        null,
        this.flags
      );
      return this;
    }
    this.realChannel = this.guild.channels.cache.get(
      this.slashCommand.channel_id
    ) as TextChannel | NewsChannel;
    this.channel = new FakeChannel(
      this,
      client,
      command.id,
      command.token,
      this.realChannel,
      this.flags
    );
    this.latestResponse = "@original";
    this.sent = false;
  }

  setFlags(flags: number) {
    // Suppress and ephemeral
    if (![1 << 2, 1 << 6].includes(flags)) return;
    this.flags = flags;
  }

  async generateContent() {
    let prefix = (this.client.commandHandler.prefix as (
      message: any
    ) => string | string[] | Promise<string | string[]>)(this);
    if (this.client.util.isPromise(prefix)) prefix = await prefix;
    if (prefix instanceof Array) prefix = prefix[0];
    let content = prefix as string;
    content += this.slashCommand.data.name + " ";
    if (this.command.args?.length && this.slashCommand.data.options?.length) {
      const argNames = (this.command.args as ArgumentOptions[]).map(
        (opt) => opt.id
      );
      const sortedArgs = this.slashCommand.data.options.sort(
        (a, b) =>
          argNames.indexOf(a.name.toLowerCase()) -
          argNames.indexOf(b.name.toLowerCase())
      );
      let args = sortedArgs.map((opt) => {
        if (
          (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name && arg.flag && arg.match == "flag"
          )
        ) {
          const arg = (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name
          );
          return arg.flag;
        } else if (
          (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name && arg.flag
          )
        )
          return `--${opt.name} ${opt.value}`;
        return opt.value;
      });
      content += args.join(" ");
    }
    this.content = content;
    return this.content;
  }

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args), {}, this.flags);
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<SlashCommandMessage | MessageReaction | void> {
    if (!key) {
      const message = this.realChannel?.messages.cache.find(
        (message) =>
          typeof message.type == "undefined" &&
          message.system &&
          message.author.id == this.member.id &&
          message.content.startsWith(
            `</${this.command.parent ? this.command.parent : this.command.id}:${
              this.slashCommand.data.id
            }>`
          )
      );
      if (message) return message.react(reactions.success).catch(() => {});
      return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
    }
    return this.channel.send(
      `${emojis.success} ${this.language.get(key, ...args)}`,
      {},
      this.flags ? this.flags : 64
    );
  }

  error(
    key: string = "",
    ...args: any[]
  ): Promise<SlashCommandMessage | MessageReaction | void> {
    if (!key) {
      const message = this.realChannel?.messages.cache.find(
        (message) =>
          typeof message.type == "undefined" &&
          message.system &&
          message.author.id == this.member.id &&
          message.content.startsWith(
            `</${this.command.id}:${this.slashCommand.data.id}>`
          )
      );
      if (message) return message.react(reactions.error).catch(() => {});
      return this.error("SLASH_COMMAND_HANDLE_FAIL");
    }
    return this.channel.send(
      `${emojis.error} ${this.language.get(key, ...args)}`,
      {},
      this.flags ? this.flags : 64
    );
  }

  edit(
    content:
      | APIMessageContentResolvable
      | MessageEditOptions
      | MessageEmbed
      | APIMessage,
    options?: MessageEditOptions | MessageEmbed
  ) {
    const { data } =
      content instanceof APIMessage
        ? content.resolveData()
        : // @ts-ignore
          APIMessage.create(this, content, options).resolveData();
    // @ts-ignore
    this.client.api
      // @ts-ignore
      .webhooks(this.client.user.id, this.slashCommand.token)
      .messages(this.latestResponse)
      .patch({
        data,
      })
      .catch(() => {});
    return this;
  }

  async delete() {
    return this;
  }
}

export class FakeChannel {
  id: string;
  client: Fire;
  token: string;
  msgFlags: number;
  messages: MessageManager;
  message: SlashCommandMessage;
  real: TextChannel | NewsChannel;

  constructor(
    message: SlashCommandMessage,
    client: Fire,
    id: string,
    token: string,
    real?: TextChannel | NewsChannel,
    msgFlags?: number
  ) {
    this.id = id;
    this.real = real;
    this.token = token;
    this.client = client;
    this.message = message;
    this.msgFlags = msgFlags;
    this.messages = real?.messages;
  }

  permissionsFor(memberOrRole: GuildMemberResolvable | RoleResolvable) {
    return this.real.permissionsFor(memberOrRole);
  }

  startTyping(count?: number) {
    return this.real.startTyping(count);
  }

  stopTyping(force?: boolean) {
    return this.real.stopTyping(force);
  }

  bulkDelete(
    messages:
      | Collection<Snowflake, Message>
      | readonly MessageResolvable[]
      | number,
    filterOld?: boolean
  ) {
    return this.real.bulkDelete(messages, filterOld);
  }

  awaitMessages(filter: CollectorFilter, options?: AwaitMessagesOptions) {
    return this.real.awaitMessages(filter, options);
  }

  // Acknowledges without sending a message
  async ack(source: boolean = false) {
    // @ts-ignore
    await this.client.api
      // @ts-ignore
      .interactions(this.id)(this.token)
      .callback.post({ data: { type: source ? 5 : 2 } })
      .then(() => (this.message.sent = true))
      .catch(() => {});
  }

  async send(
    content: StringResolvable | APIMessage | MessageEmbed,
    options?: MessageOptions | MessageAdditions,
    flags?: number // Used for success/error, can also be set
  ): Promise<SlashCommandMessage> {
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embed: content,
      };
      content = null;
    }

    if (content instanceof APIMessage) content.resolveData();
    else {
      apiMessage = APIMessage.create(
        // @ts-ignore
        { client: this.client },
        content,
        options
      ).resolveData();
    }

    const { data, files } = await apiMessage.resolveFiles();

    // @ts-ignore
    data.flags = this.msgFlags;
    // @ts-ignore
    if (typeof flags == "number") data.flags = flags;

    // embeds in ephemeral wen eta
    // @ts-ignore
    if (data.embeds?.length && (data.flags & 64) == 64) data.flags -= 1 << 6;

    if (!this.message.sent)
      // @ts-ignore
      await this.client.api
        // @ts-ignore
        .interactions(this.id)(this.token)
        .callback.post({
          data: {
            // @ts-ignore
            type: (data.flags & 64) == 64 && !data.embeds?.length ? 3 : 4,
            data,
          },
          files,
        })
        .then(() => (this.message.sent = true))
        .catch(() => {});
    else {
      // @ts-ignore
      const webhook = await this.client.api
        // @ts-ignore
        .webhooks(this.client.user.id)(this.token)
        .post({
          data,
          files,
        })
        .catch(() => {});
      if (webhook?.id) this.message.latestResponse = webhook.id;
    }
    return this.message;
  }
}
