import { PrismaClient } from "@prisma/client";

declare module ".prisma/client" {
  export type ParticipantRole = "host" | "participant";
  export type ExternalChatRoomType = "direct" | "group" | "channel";

  export namespace Prisma {
    export type ExternalChatRoomWhereInput = any;
    export type ExternalChatRoomUpdateInput = any;
    export type ExternalChatMessageUpdateInput = any;
  }

  export interface ChatRoom {
    id: string;
    code: string;
    title: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Participant[];
  }

  export interface Participant {
    id: string;
    roomId: string;
    userId: string;
    role: ParticipantRole;
    micStatus: boolean;
    cameraStatus: boolean;
    joinedAt: Date;
    leftAt: Date | null;
    removedAt: Date | null;
    user: any;
  }

  export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    fileId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    sender: any;
    file: any;
    room: any;
  }

  export interface ExternalChatRoom {
    id: string;
    workspaceId: string;
    code: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    type: ExternalChatRoomType;
    isPrivate: boolean;
    isDiscoverable: boolean;
    inviteCode: string | null;
    createdBy: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    members: ExternalChatRoomMember[];
    messages: ExternalChatMessage[];
  }

  export interface ExternalChatRoomMember {
    id: string;
    roomId: string;
    userId: string;
    role: string;
    muted: boolean;
    joinedAt: Date;
    lastSeenAt: Date | null;
    leftAt: Date | null;
    removedAt: Date | null;
    user: any;
    room: any;
  }

  export interface ExternalChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    type: any;
    content: string;
    metadata: any;
    mentions: any;
    privateTo: any;
    replyToId: string | null;
    editedAt: Date | null;
    pinnedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    room: ExternalChatRoom;
    sender: any;
    attachment: any;
    reactions: any[];
    seenBy: any[];
  }

  interface LegacyModelDelegate<T> {
    findUnique(args?: any): Promise<T | null>;
    findFirst(args?: any): Promise<T | null>;
    findMany(args?: any): Promise<T[]>;
    create(args: any): Promise<T>;
    createMany(args: any): Promise<any>;
    update(args: any): Promise<T>;
    updateMany(args: any): Promise<any>;
    delete(args: any): Promise<T>;
    deleteMany(args: any): Promise<any>;
    upsert(args: any): Promise<T>;
    count(args?: any): Promise<number>;
    groupBy(args?: any): Promise<any>;
  }

  interface PrismaClient {
    chatRoom: LegacyModelDelegate<ChatRoom>;
    chatMessage: LegacyModelDelegate<ChatMessage>;
    participant: LegacyModelDelegate<Participant>;
    externalChatRoom: LegacyModelDelegate<ExternalChatRoom>;
    externalChatRoomMember: LegacyModelDelegate<ExternalChatRoomMember>;
    externalChatMessage: LegacyModelDelegate<ExternalChatMessage>;
  }
}

declare module "@prisma/client" {
  export type ParticipantRole = "host" | "participant";
  export type ExternalChatRoomType = "direct" | "group" | "channel";

  export namespace Prisma {
    export type ExternalChatRoomWhereInput = any;
    export type ExternalChatRoomUpdateInput = any;
    export type ExternalChatMessageUpdateInput = any;
  }

  export interface ChatRoom {
    id: string;
    code: string;
    title: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Participant[];
  }

  export interface Participant {
    id: string;
    roomId: string;
    userId: string;
    role: ParticipantRole;
    micStatus: boolean;
    cameraStatus: boolean;
    joinedAt: Date;
    leftAt: Date | null;
    removedAt: Date | null;
    user: any;
  }

  export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    fileId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    sender: any;
    file: any;
    room: any;
  }

  export interface ExternalChatRoom {
    id: string;
    workspaceId: string;
    code: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    type: ExternalChatRoomType;
    isPrivate: boolean;
    isDiscoverable: boolean;
    inviteCode: string | null;
    createdBy: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    members: ExternalChatRoomMember[];
    messages: ExternalChatMessage[];
  }

  export interface ExternalChatRoomMember {
    id: string;
    roomId: string;
    userId: string;
    role: string;
    muted: boolean;
    joinedAt: Date;
    lastSeenAt: Date | null;
    leftAt: Date | null;
    removedAt: Date | null;
    user: any;
    room: any;
  }

  export interface ExternalChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    type: any;
    content: string;
    metadata: any;
    mentions: any;
    privateTo: any;
    replyToId: string | null;
    editedAt: Date | null;
    pinnedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    room: ExternalChatRoom;
    sender: any;
    attachment: any;
    reactions: any[];
    seenBy: any[];
  }

  interface LegacyModelDelegate<T> {
    findUnique(args?: any): Promise<T | null>;
    findFirst(args?: any): Promise<T | null>;
    findMany(args?: any): Promise<T[]>;
    create(args: any): Promise<T>;
    createMany(args: any): Promise<any>;
    update(args: any): Promise<T>;
    updateMany(args: any): Promise<any>;
    delete(args: any): Promise<T>;
    deleteMany(args: any): Promise<any>;
    upsert(args: any): Promise<T>;
    count(args?: any): Promise<number>;
    groupBy(args?: any): Promise<any>;
  }

  interface PrismaClient {
    chatRoom: LegacyModelDelegate<ChatRoom>;
    chatMessage: LegacyModelDelegate<ChatMessage>;
    participant: LegacyModelDelegate<Participant>;
    externalChatRoom: LegacyModelDelegate<ExternalChatRoom>;
    externalChatRoomMember: LegacyModelDelegate<ExternalChatRoomMember>;
    externalChatMessage: LegacyModelDelegate<ExternalChatMessage>;
  }
}
