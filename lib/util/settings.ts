import { MessageUtil } from "../ws/util/MessageUtil";
import { EventType } from "../ws/util/constants";
import { FireGuild } from "../extensions/guild";
import { FireUser } from "../extensions/user";
import { Message } from "../ws/Message";
import { Fire } from "../Fire";

export class GuildSettings {
  client: Fire;
  guild: string | FireGuild;

  constructor(client: Fire, guild: string | FireGuild) {
    this.client = client;
    this.guild = guild;
  }

  has(option: string) {
    const guild = this.guild instanceof FireGuild ? this.guild.id : this.guild;
    return (
      this.client.guildSettings.items.has(guild) &&
      Object.keys(this.client.guildSettings.items.get(guild)).includes(option)
    );
  }

  get(option: string, defaultValue: any = null) {
    return this.client.guildSettings.get(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    return this.client.guildSettings.set(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      value
    );
  }

  delete(option: string) {
    if (!this.has(option)) return true;
    return this.client.guildSettings.delete(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option
    );
  }
}

export class UserSettings {
  client: Fire;
  user: FireUser;

  constructor(client: Fire, user: FireUser) {
    this.client = client;
    this.user = user;
  }

  has(option: string) {
    const user = this.user instanceof FireUser ? this.user.id : this.user;
    return (
      this.client.userSettings.items.has(user) &&
      Object.keys(this.client.userSettings.items.get(user)).includes(option)
    );
  }

  get(option: string, defaultValue: any = null) {
    return this.client.userSettings.get(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    const result = this.client.userSettings.set(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      value
    );
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.SETTINGS_SYNC, {
          id: this.client.manager.id,
          user: this.user instanceof FireUser ? this.user.id : this.user,
          setting: option,
          value,
        })
      )
    );
    return result;
  }

  delete(option: string) {
    if (!this.has(option)) return true;
    const result = this.client.userSettings.delete(
      this.user instanceof FireUser ? this.user.id : this.user,
      option
    );
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.SETTINGS_SYNC, {
          id: this.client.manager.id,
          user: this.user instanceof FireUser ? this.user.id : this.user,
          setting: option,
          value: "deleteSetting",
        })
      )
    );
    return result;
  }
}
