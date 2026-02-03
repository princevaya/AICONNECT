
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Meeting
 * 
 */
export type Meeting = $Result.DefaultSelection<Prisma.$MeetingPayload>
/**
 * Model Recording
 * 
 */
export type Recording = $Result.DefaultSelection<Prisma.$RecordingPayload>
/**
 * Model MeetingNote
 * 
 */
export type MeetingNote = $Result.DefaultSelection<Prisma.$MeetingNotePayload>
/**
 * Model meeting_rooms
 * 
 */
export type meeting_rooms = $Result.DefaultSelection<Prisma.$meeting_roomsPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.meeting`: Exposes CRUD operations for the **Meeting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Meetings
    * const meetings = await prisma.meeting.findMany()
    * ```
    */
  get meeting(): Prisma.MeetingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.recording`: Exposes CRUD operations for the **Recording** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Recordings
    * const recordings = await prisma.recording.findMany()
    * ```
    */
  get recording(): Prisma.RecordingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.meetingNote`: Exposes CRUD operations for the **MeetingNote** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MeetingNotes
    * const meetingNotes = await prisma.meetingNote.findMany()
    * ```
    */
  get meetingNote(): Prisma.MeetingNoteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.meeting_rooms`: Exposes CRUD operations for the **meeting_rooms** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Meeting_rooms
    * const meeting_rooms = await prisma.meeting_rooms.findMany()
    * ```
    */
  get meeting_rooms(): Prisma.meeting_roomsDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.3.0
   * Query Engine version: 9d6ad21cbbceab97458517b147a6a09ff43aa735
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Meeting: 'Meeting',
    Recording: 'Recording',
    MeetingNote: 'MeetingNote',
    meeting_rooms: 'meeting_rooms'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "meeting" | "recording" | "meetingNote" | "meeting_rooms"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Meeting: {
        payload: Prisma.$MeetingPayload<ExtArgs>
        fields: Prisma.MeetingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MeetingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MeetingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          findFirst: {
            args: Prisma.MeetingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MeetingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          findMany: {
            args: Prisma.MeetingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>[]
          }
          create: {
            args: Prisma.MeetingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          createMany: {
            args: Prisma.MeetingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MeetingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>[]
          }
          delete: {
            args: Prisma.MeetingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          update: {
            args: Prisma.MeetingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          deleteMany: {
            args: Prisma.MeetingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MeetingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MeetingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>[]
          }
          upsert: {
            args: Prisma.MeetingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingPayload>
          }
          aggregate: {
            args: Prisma.MeetingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMeeting>
          }
          groupBy: {
            args: Prisma.MeetingGroupByArgs<ExtArgs>
            result: $Utils.Optional<MeetingGroupByOutputType>[]
          }
          count: {
            args: Prisma.MeetingCountArgs<ExtArgs>
            result: $Utils.Optional<MeetingCountAggregateOutputType> | number
          }
        }
      }
      Recording: {
        payload: Prisma.$RecordingPayload<ExtArgs>
        fields: Prisma.RecordingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RecordingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RecordingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          findFirst: {
            args: Prisma.RecordingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RecordingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          findMany: {
            args: Prisma.RecordingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>[]
          }
          create: {
            args: Prisma.RecordingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          createMany: {
            args: Prisma.RecordingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RecordingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>[]
          }
          delete: {
            args: Prisma.RecordingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          update: {
            args: Prisma.RecordingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          deleteMany: {
            args: Prisma.RecordingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RecordingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RecordingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>[]
          }
          upsert: {
            args: Prisma.RecordingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RecordingPayload>
          }
          aggregate: {
            args: Prisma.RecordingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRecording>
          }
          groupBy: {
            args: Prisma.RecordingGroupByArgs<ExtArgs>
            result: $Utils.Optional<RecordingGroupByOutputType>[]
          }
          count: {
            args: Prisma.RecordingCountArgs<ExtArgs>
            result: $Utils.Optional<RecordingCountAggregateOutputType> | number
          }
        }
      }
      MeetingNote: {
        payload: Prisma.$MeetingNotePayload<ExtArgs>
        fields: Prisma.MeetingNoteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MeetingNoteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MeetingNoteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          findFirst: {
            args: Prisma.MeetingNoteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MeetingNoteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          findMany: {
            args: Prisma.MeetingNoteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>[]
          }
          create: {
            args: Prisma.MeetingNoteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          createMany: {
            args: Prisma.MeetingNoteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MeetingNoteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>[]
          }
          delete: {
            args: Prisma.MeetingNoteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          update: {
            args: Prisma.MeetingNoteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          deleteMany: {
            args: Prisma.MeetingNoteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MeetingNoteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MeetingNoteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>[]
          }
          upsert: {
            args: Prisma.MeetingNoteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MeetingNotePayload>
          }
          aggregate: {
            args: Prisma.MeetingNoteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMeetingNote>
          }
          groupBy: {
            args: Prisma.MeetingNoteGroupByArgs<ExtArgs>
            result: $Utils.Optional<MeetingNoteGroupByOutputType>[]
          }
          count: {
            args: Prisma.MeetingNoteCountArgs<ExtArgs>
            result: $Utils.Optional<MeetingNoteCountAggregateOutputType> | number
          }
        }
      }
      meeting_rooms: {
        payload: Prisma.$meeting_roomsPayload<ExtArgs>
        fields: Prisma.meeting_roomsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.meeting_roomsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.meeting_roomsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          findFirst: {
            args: Prisma.meeting_roomsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.meeting_roomsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          findMany: {
            args: Prisma.meeting_roomsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>[]
          }
          create: {
            args: Prisma.meeting_roomsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          createMany: {
            args: Prisma.meeting_roomsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.meeting_roomsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>[]
          }
          delete: {
            args: Prisma.meeting_roomsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          update: {
            args: Prisma.meeting_roomsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          deleteMany: {
            args: Prisma.meeting_roomsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.meeting_roomsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.meeting_roomsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>[]
          }
          upsert: {
            args: Prisma.meeting_roomsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$meeting_roomsPayload>
          }
          aggregate: {
            args: Prisma.Meeting_roomsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMeeting_rooms>
          }
          groupBy: {
            args: Prisma.meeting_roomsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Meeting_roomsGroupByOutputType>[]
          }
          count: {
            args: Prisma.meeting_roomsCountArgs<ExtArgs>
            result: $Utils.Optional<Meeting_roomsCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    meeting?: MeetingOmit
    recording?: RecordingOmit
    meetingNote?: MeetingNoteOmit
    meeting_rooms?: meeting_roomsOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type MeetingCountOutputType
   */

  export type MeetingCountOutputType = {
    MeetingNote: number
    recordings: number
  }

  export type MeetingCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    MeetingNote?: boolean | MeetingCountOutputTypeCountMeetingNoteArgs
    recordings?: boolean | MeetingCountOutputTypeCountRecordingsArgs
  }

  // Custom InputTypes
  /**
   * MeetingCountOutputType without action
   */
  export type MeetingCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingCountOutputType
     */
    select?: MeetingCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MeetingCountOutputType without action
   */
  export type MeetingCountOutputTypeCountMeetingNoteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MeetingNoteWhereInput
  }

  /**
   * MeetingCountOutputType without action
   */
  export type MeetingCountOutputTypeCountRecordingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RecordingWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    clerkId: string | null
    name: string | null
    email: string | null
    imageUrl: string | null
    role: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    clerkId: string | null
    name: string | null
    email: string | null
    imageUrl: string | null
    role: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    clerkId: number
    name: number
    email: number
    imageUrl: number
    role: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    clerkId?: true
    name?: true
    email?: true
    imageUrl?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    clerkId?: true
    name?: true
    email?: true
    imageUrl?: true
    role?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    clerkId?: true
    name?: true
    email?: true
    imageUrl?: true
    role?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    clerkId: string
    name: string | null
    email: string | null
    imageUrl: string | null
    role: string
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkId?: boolean
    name?: boolean
    email?: boolean
    imageUrl?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkId?: boolean
    name?: boolean
    email?: boolean
    imageUrl?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkId?: boolean
    name?: boolean
    email?: boolean
    imageUrl?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    clerkId?: boolean
    name?: boolean
    email?: boolean
    imageUrl?: boolean
    role?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clerkId" | "name" | "email" | "imageUrl" | "role" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clerkId: string
      name: string | null
      email: string | null
      imageUrl: string | null
      role: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly clerkId: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly imageUrl: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
  }


  /**
   * Model Meeting
   */

  export type AggregateMeeting = {
    _count: MeetingCountAggregateOutputType | null
    _avg: MeetingAvgAggregateOutputType | null
    _sum: MeetingSumAggregateOutputType | null
    _min: MeetingMinAggregateOutputType | null
    _max: MeetingMaxAggregateOutputType | null
  }

  export type MeetingAvgAggregateOutputType = {
    durationMins: number | null
  }

  export type MeetingSumAggregateOutputType = {
    durationMins: number | null
  }

  export type MeetingMinAggregateOutputType = {
    id: string | null
    code: string | null
    title: string | null
    date: Date | null
    scheduledFor: Date | null
    startTime: Date | null
    endTime: Date | null
    durationMins: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MeetingMaxAggregateOutputType = {
    id: string | null
    code: string | null
    title: string | null
    date: Date | null
    scheduledFor: Date | null
    startTime: Date | null
    endTime: Date | null
    durationMins: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MeetingCountAggregateOutputType = {
    id: number
    code: number
    title: number
    date: number
    scheduledFor: number
    startTime: number
    endTime: number
    durationMins: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MeetingAvgAggregateInputType = {
    durationMins?: true
  }

  export type MeetingSumAggregateInputType = {
    durationMins?: true
  }

  export type MeetingMinAggregateInputType = {
    id?: true
    code?: true
    title?: true
    date?: true
    scheduledFor?: true
    startTime?: true
    endTime?: true
    durationMins?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MeetingMaxAggregateInputType = {
    id?: true
    code?: true
    title?: true
    date?: true
    scheduledFor?: true
    startTime?: true
    endTime?: true
    durationMins?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MeetingCountAggregateInputType = {
    id?: true
    code?: true
    title?: true
    date?: true
    scheduledFor?: true
    startTime?: true
    endTime?: true
    durationMins?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MeetingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Meeting to aggregate.
     */
    where?: MeetingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Meetings to fetch.
     */
    orderBy?: MeetingOrderByWithRelationInput | MeetingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MeetingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Meetings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Meetings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Meetings
    **/
    _count?: true | MeetingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MeetingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MeetingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MeetingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MeetingMaxAggregateInputType
  }

  export type GetMeetingAggregateType<T extends MeetingAggregateArgs> = {
        [P in keyof T & keyof AggregateMeeting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMeeting[P]>
      : GetScalarType<T[P], AggregateMeeting[P]>
  }




  export type MeetingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MeetingWhereInput
    orderBy?: MeetingOrderByWithAggregationInput | MeetingOrderByWithAggregationInput[]
    by: MeetingScalarFieldEnum[] | MeetingScalarFieldEnum
    having?: MeetingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MeetingCountAggregateInputType | true
    _avg?: MeetingAvgAggregateInputType
    _sum?: MeetingSumAggregateInputType
    _min?: MeetingMinAggregateInputType
    _max?: MeetingMaxAggregateInputType
  }

  export type MeetingGroupByOutputType = {
    id: string
    code: string
    title: string
    date: Date
    scheduledFor: Date
    startTime: Date
    endTime: Date
    durationMins: number
    createdAt: Date
    updatedAt: Date
    _count: MeetingCountAggregateOutputType | null
    _avg: MeetingAvgAggregateOutputType | null
    _sum: MeetingSumAggregateOutputType | null
    _min: MeetingMinAggregateOutputType | null
    _max: MeetingMaxAggregateOutputType | null
  }

  type GetMeetingGroupByPayload<T extends MeetingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MeetingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MeetingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MeetingGroupByOutputType[P]>
            : GetScalarType<T[P], MeetingGroupByOutputType[P]>
        }
      >
    >


  export type MeetingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    title?: boolean
    date?: boolean
    scheduledFor?: boolean
    startTime?: boolean
    endTime?: boolean
    durationMins?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    MeetingNote?: boolean | Meeting$MeetingNoteArgs<ExtArgs>
    recordings?: boolean | Meeting$recordingsArgs<ExtArgs>
    _count?: boolean | MeetingCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["meeting"]>

  export type MeetingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    title?: boolean
    date?: boolean
    scheduledFor?: boolean
    startTime?: boolean
    endTime?: boolean
    durationMins?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["meeting"]>

  export type MeetingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    title?: boolean
    date?: boolean
    scheduledFor?: boolean
    startTime?: boolean
    endTime?: boolean
    durationMins?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["meeting"]>

  export type MeetingSelectScalar = {
    id?: boolean
    code?: boolean
    title?: boolean
    date?: boolean
    scheduledFor?: boolean
    startTime?: boolean
    endTime?: boolean
    durationMins?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MeetingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "title" | "date" | "scheduledFor" | "startTime" | "endTime" | "durationMins" | "createdAt" | "updatedAt", ExtArgs["result"]["meeting"]>
  export type MeetingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    MeetingNote?: boolean | Meeting$MeetingNoteArgs<ExtArgs>
    recordings?: boolean | Meeting$recordingsArgs<ExtArgs>
    _count?: boolean | MeetingCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MeetingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type MeetingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $MeetingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Meeting"
    objects: {
      MeetingNote: Prisma.$MeetingNotePayload<ExtArgs>[]
      recordings: Prisma.$RecordingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      title: string
      date: Date
      scheduledFor: Date
      startTime: Date
      endTime: Date
      durationMins: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["meeting"]>
    composites: {}
  }

  type MeetingGetPayload<S extends boolean | null | undefined | MeetingDefaultArgs> = $Result.GetResult<Prisma.$MeetingPayload, S>

  type MeetingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MeetingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MeetingCountAggregateInputType | true
    }

  export interface MeetingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Meeting'], meta: { name: 'Meeting' } }
    /**
     * Find zero or one Meeting that matches the filter.
     * @param {MeetingFindUniqueArgs} args - Arguments to find a Meeting
     * @example
     * // Get one Meeting
     * const meeting = await prisma.meeting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MeetingFindUniqueArgs>(args: SelectSubset<T, MeetingFindUniqueArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Meeting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MeetingFindUniqueOrThrowArgs} args - Arguments to find a Meeting
     * @example
     * // Get one Meeting
     * const meeting = await prisma.meeting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MeetingFindUniqueOrThrowArgs>(args: SelectSubset<T, MeetingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Meeting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingFindFirstArgs} args - Arguments to find a Meeting
     * @example
     * // Get one Meeting
     * const meeting = await prisma.meeting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MeetingFindFirstArgs>(args?: SelectSubset<T, MeetingFindFirstArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Meeting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingFindFirstOrThrowArgs} args - Arguments to find a Meeting
     * @example
     * // Get one Meeting
     * const meeting = await prisma.meeting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MeetingFindFirstOrThrowArgs>(args?: SelectSubset<T, MeetingFindFirstOrThrowArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Meetings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Meetings
     * const meetings = await prisma.meeting.findMany()
     * 
     * // Get first 10 Meetings
     * const meetings = await prisma.meeting.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const meetingWithIdOnly = await prisma.meeting.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MeetingFindManyArgs>(args?: SelectSubset<T, MeetingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Meeting.
     * @param {MeetingCreateArgs} args - Arguments to create a Meeting.
     * @example
     * // Create one Meeting
     * const Meeting = await prisma.meeting.create({
     *   data: {
     *     // ... data to create a Meeting
     *   }
     * })
     * 
     */
    create<T extends MeetingCreateArgs>(args: SelectSubset<T, MeetingCreateArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Meetings.
     * @param {MeetingCreateManyArgs} args - Arguments to create many Meetings.
     * @example
     * // Create many Meetings
     * const meeting = await prisma.meeting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MeetingCreateManyArgs>(args?: SelectSubset<T, MeetingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Meetings and returns the data saved in the database.
     * @param {MeetingCreateManyAndReturnArgs} args - Arguments to create many Meetings.
     * @example
     * // Create many Meetings
     * const meeting = await prisma.meeting.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Meetings and only return the `id`
     * const meetingWithIdOnly = await prisma.meeting.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MeetingCreateManyAndReturnArgs>(args?: SelectSubset<T, MeetingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Meeting.
     * @param {MeetingDeleteArgs} args - Arguments to delete one Meeting.
     * @example
     * // Delete one Meeting
     * const Meeting = await prisma.meeting.delete({
     *   where: {
     *     // ... filter to delete one Meeting
     *   }
     * })
     * 
     */
    delete<T extends MeetingDeleteArgs>(args: SelectSubset<T, MeetingDeleteArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Meeting.
     * @param {MeetingUpdateArgs} args - Arguments to update one Meeting.
     * @example
     * // Update one Meeting
     * const meeting = await prisma.meeting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MeetingUpdateArgs>(args: SelectSubset<T, MeetingUpdateArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Meetings.
     * @param {MeetingDeleteManyArgs} args - Arguments to filter Meetings to delete.
     * @example
     * // Delete a few Meetings
     * const { count } = await prisma.meeting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MeetingDeleteManyArgs>(args?: SelectSubset<T, MeetingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Meetings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Meetings
     * const meeting = await prisma.meeting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MeetingUpdateManyArgs>(args: SelectSubset<T, MeetingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Meetings and returns the data updated in the database.
     * @param {MeetingUpdateManyAndReturnArgs} args - Arguments to update many Meetings.
     * @example
     * // Update many Meetings
     * const meeting = await prisma.meeting.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Meetings and only return the `id`
     * const meetingWithIdOnly = await prisma.meeting.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MeetingUpdateManyAndReturnArgs>(args: SelectSubset<T, MeetingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Meeting.
     * @param {MeetingUpsertArgs} args - Arguments to update or create a Meeting.
     * @example
     * // Update or create a Meeting
     * const meeting = await prisma.meeting.upsert({
     *   create: {
     *     // ... data to create a Meeting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Meeting we want to update
     *   }
     * })
     */
    upsert<T extends MeetingUpsertArgs>(args: SelectSubset<T, MeetingUpsertArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Meetings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingCountArgs} args - Arguments to filter Meetings to count.
     * @example
     * // Count the number of Meetings
     * const count = await prisma.meeting.count({
     *   where: {
     *     // ... the filter for the Meetings we want to count
     *   }
     * })
    **/
    count<T extends MeetingCountArgs>(
      args?: Subset<T, MeetingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MeetingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Meeting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MeetingAggregateArgs>(args: Subset<T, MeetingAggregateArgs>): Prisma.PrismaPromise<GetMeetingAggregateType<T>>

    /**
     * Group by Meeting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MeetingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MeetingGroupByArgs['orderBy'] }
        : { orderBy?: MeetingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MeetingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMeetingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Meeting model
   */
  readonly fields: MeetingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Meeting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MeetingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    MeetingNote<T extends Meeting$MeetingNoteArgs<ExtArgs> = {}>(args?: Subset<T, Meeting$MeetingNoteArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    recordings<T extends Meeting$recordingsArgs<ExtArgs> = {}>(args?: Subset<T, Meeting$recordingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Meeting model
   */
  interface MeetingFieldRefs {
    readonly id: FieldRef<"Meeting", 'String'>
    readonly code: FieldRef<"Meeting", 'String'>
    readonly title: FieldRef<"Meeting", 'String'>
    readonly date: FieldRef<"Meeting", 'DateTime'>
    readonly scheduledFor: FieldRef<"Meeting", 'DateTime'>
    readonly startTime: FieldRef<"Meeting", 'DateTime'>
    readonly endTime: FieldRef<"Meeting", 'DateTime'>
    readonly durationMins: FieldRef<"Meeting", 'Int'>
    readonly createdAt: FieldRef<"Meeting", 'DateTime'>
    readonly updatedAt: FieldRef<"Meeting", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Meeting findUnique
   */
  export type MeetingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter, which Meeting to fetch.
     */
    where: MeetingWhereUniqueInput
  }

  /**
   * Meeting findUniqueOrThrow
   */
  export type MeetingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter, which Meeting to fetch.
     */
    where: MeetingWhereUniqueInput
  }

  /**
   * Meeting findFirst
   */
  export type MeetingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter, which Meeting to fetch.
     */
    where?: MeetingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Meetings to fetch.
     */
    orderBy?: MeetingOrderByWithRelationInput | MeetingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Meetings.
     */
    cursor?: MeetingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Meetings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Meetings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Meetings.
     */
    distinct?: MeetingScalarFieldEnum | MeetingScalarFieldEnum[]
  }

  /**
   * Meeting findFirstOrThrow
   */
  export type MeetingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter, which Meeting to fetch.
     */
    where?: MeetingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Meetings to fetch.
     */
    orderBy?: MeetingOrderByWithRelationInput | MeetingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Meetings.
     */
    cursor?: MeetingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Meetings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Meetings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Meetings.
     */
    distinct?: MeetingScalarFieldEnum | MeetingScalarFieldEnum[]
  }

  /**
   * Meeting findMany
   */
  export type MeetingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter, which Meetings to fetch.
     */
    where?: MeetingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Meetings to fetch.
     */
    orderBy?: MeetingOrderByWithRelationInput | MeetingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Meetings.
     */
    cursor?: MeetingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Meetings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Meetings.
     */
    skip?: number
    distinct?: MeetingScalarFieldEnum | MeetingScalarFieldEnum[]
  }

  /**
   * Meeting create
   */
  export type MeetingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * The data needed to create a Meeting.
     */
    data: XOR<MeetingCreateInput, MeetingUncheckedCreateInput>
  }

  /**
   * Meeting createMany
   */
  export type MeetingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Meetings.
     */
    data: MeetingCreateManyInput | MeetingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Meeting createManyAndReturn
   */
  export type MeetingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * The data used to create many Meetings.
     */
    data: MeetingCreateManyInput | MeetingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Meeting update
   */
  export type MeetingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * The data needed to update a Meeting.
     */
    data: XOR<MeetingUpdateInput, MeetingUncheckedUpdateInput>
    /**
     * Choose, which Meeting to update.
     */
    where: MeetingWhereUniqueInput
  }

  /**
   * Meeting updateMany
   */
  export type MeetingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Meetings.
     */
    data: XOR<MeetingUpdateManyMutationInput, MeetingUncheckedUpdateManyInput>
    /**
     * Filter which Meetings to update
     */
    where?: MeetingWhereInput
    /**
     * Limit how many Meetings to update.
     */
    limit?: number
  }

  /**
   * Meeting updateManyAndReturn
   */
  export type MeetingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * The data used to update Meetings.
     */
    data: XOR<MeetingUpdateManyMutationInput, MeetingUncheckedUpdateManyInput>
    /**
     * Filter which Meetings to update
     */
    where?: MeetingWhereInput
    /**
     * Limit how many Meetings to update.
     */
    limit?: number
  }

  /**
   * Meeting upsert
   */
  export type MeetingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * The filter to search for the Meeting to update in case it exists.
     */
    where: MeetingWhereUniqueInput
    /**
     * In case the Meeting found by the `where` argument doesn't exist, create a new Meeting with this data.
     */
    create: XOR<MeetingCreateInput, MeetingUncheckedCreateInput>
    /**
     * In case the Meeting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MeetingUpdateInput, MeetingUncheckedUpdateInput>
  }

  /**
   * Meeting delete
   */
  export type MeetingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
    /**
     * Filter which Meeting to delete.
     */
    where: MeetingWhereUniqueInput
  }

  /**
   * Meeting deleteMany
   */
  export type MeetingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Meetings to delete
     */
    where?: MeetingWhereInput
    /**
     * Limit how many Meetings to delete.
     */
    limit?: number
  }

  /**
   * Meeting.MeetingNote
   */
  export type Meeting$MeetingNoteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    where?: MeetingNoteWhereInput
    orderBy?: MeetingNoteOrderByWithRelationInput | MeetingNoteOrderByWithRelationInput[]
    cursor?: MeetingNoteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MeetingNoteScalarFieldEnum | MeetingNoteScalarFieldEnum[]
  }

  /**
   * Meeting.recordings
   */
  export type Meeting$recordingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    where?: RecordingWhereInput
    orderBy?: RecordingOrderByWithRelationInput | RecordingOrderByWithRelationInput[]
    cursor?: RecordingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RecordingScalarFieldEnum | RecordingScalarFieldEnum[]
  }

  /**
   * Meeting without action
   */
  export type MeetingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Meeting
     */
    select?: MeetingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Meeting
     */
    omit?: MeetingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingInclude<ExtArgs> | null
  }


  /**
   * Model Recording
   */

  export type AggregateRecording = {
    _count: RecordingCountAggregateOutputType | null
    _avg: RecordingAvgAggregateOutputType | null
    _sum: RecordingSumAggregateOutputType | null
    _min: RecordingMinAggregateOutputType | null
    _max: RecordingMaxAggregateOutputType | null
  }

  export type RecordingAvgAggregateOutputType = {
    duration: number | null
  }

  export type RecordingSumAggregateOutputType = {
    duration: number | null
  }

  export type RecordingMinAggregateOutputType = {
    id: string | null
    meetingId: string | null
    title: string | null
    s3Url: string | null
    duration: number | null
    createdAt: Date | null
  }

  export type RecordingMaxAggregateOutputType = {
    id: string | null
    meetingId: string | null
    title: string | null
    s3Url: string | null
    duration: number | null
    createdAt: Date | null
  }

  export type RecordingCountAggregateOutputType = {
    id: number
    meetingId: number
    title: number
    s3Url: number
    duration: number
    createdAt: number
    _all: number
  }


  export type RecordingAvgAggregateInputType = {
    duration?: true
  }

  export type RecordingSumAggregateInputType = {
    duration?: true
  }

  export type RecordingMinAggregateInputType = {
    id?: true
    meetingId?: true
    title?: true
    s3Url?: true
    duration?: true
    createdAt?: true
  }

  export type RecordingMaxAggregateInputType = {
    id?: true
    meetingId?: true
    title?: true
    s3Url?: true
    duration?: true
    createdAt?: true
  }

  export type RecordingCountAggregateInputType = {
    id?: true
    meetingId?: true
    title?: true
    s3Url?: true
    duration?: true
    createdAt?: true
    _all?: true
  }

  export type RecordingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Recording to aggregate.
     */
    where?: RecordingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Recordings to fetch.
     */
    orderBy?: RecordingOrderByWithRelationInput | RecordingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RecordingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Recordings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Recordings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Recordings
    **/
    _count?: true | RecordingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RecordingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RecordingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RecordingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RecordingMaxAggregateInputType
  }

  export type GetRecordingAggregateType<T extends RecordingAggregateArgs> = {
        [P in keyof T & keyof AggregateRecording]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRecording[P]>
      : GetScalarType<T[P], AggregateRecording[P]>
  }




  export type RecordingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RecordingWhereInput
    orderBy?: RecordingOrderByWithAggregationInput | RecordingOrderByWithAggregationInput[]
    by: RecordingScalarFieldEnum[] | RecordingScalarFieldEnum
    having?: RecordingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RecordingCountAggregateInputType | true
    _avg?: RecordingAvgAggregateInputType
    _sum?: RecordingSumAggregateInputType
    _min?: RecordingMinAggregateInputType
    _max?: RecordingMaxAggregateInputType
  }

  export type RecordingGroupByOutputType = {
    id: string
    meetingId: string
    title: string
    s3Url: string
    duration: number | null
    createdAt: Date
    _count: RecordingCountAggregateOutputType | null
    _avg: RecordingAvgAggregateOutputType | null
    _sum: RecordingSumAggregateOutputType | null
    _min: RecordingMinAggregateOutputType | null
    _max: RecordingMaxAggregateOutputType | null
  }

  type GetRecordingGroupByPayload<T extends RecordingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RecordingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RecordingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RecordingGroupByOutputType[P]>
            : GetScalarType<T[P], RecordingGroupByOutputType[P]>
        }
      >
    >


  export type RecordingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    title?: boolean
    s3Url?: boolean
    duration?: boolean
    createdAt?: boolean
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["recording"]>

  export type RecordingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    title?: boolean
    s3Url?: boolean
    duration?: boolean
    createdAt?: boolean
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["recording"]>

  export type RecordingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    title?: boolean
    s3Url?: boolean
    duration?: boolean
    createdAt?: boolean
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["recording"]>

  export type RecordingSelectScalar = {
    id?: boolean
    meetingId?: boolean
    title?: boolean
    s3Url?: boolean
    duration?: boolean
    createdAt?: boolean
  }

  export type RecordingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "meetingId" | "title" | "s3Url" | "duration" | "createdAt", ExtArgs["result"]["recording"]>
  export type RecordingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }
  export type RecordingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }
  export type RecordingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }

  export type $RecordingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Recording"
    objects: {
      meeting: Prisma.$MeetingPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      meetingId: string
      title: string
      s3Url: string
      duration: number | null
      createdAt: Date
    }, ExtArgs["result"]["recording"]>
    composites: {}
  }

  type RecordingGetPayload<S extends boolean | null | undefined | RecordingDefaultArgs> = $Result.GetResult<Prisma.$RecordingPayload, S>

  type RecordingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RecordingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RecordingCountAggregateInputType | true
    }

  export interface RecordingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Recording'], meta: { name: 'Recording' } }
    /**
     * Find zero or one Recording that matches the filter.
     * @param {RecordingFindUniqueArgs} args - Arguments to find a Recording
     * @example
     * // Get one Recording
     * const recording = await prisma.recording.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RecordingFindUniqueArgs>(args: SelectSubset<T, RecordingFindUniqueArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Recording that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RecordingFindUniqueOrThrowArgs} args - Arguments to find a Recording
     * @example
     * // Get one Recording
     * const recording = await prisma.recording.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RecordingFindUniqueOrThrowArgs>(args: SelectSubset<T, RecordingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Recording that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingFindFirstArgs} args - Arguments to find a Recording
     * @example
     * // Get one Recording
     * const recording = await prisma.recording.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RecordingFindFirstArgs>(args?: SelectSubset<T, RecordingFindFirstArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Recording that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingFindFirstOrThrowArgs} args - Arguments to find a Recording
     * @example
     * // Get one Recording
     * const recording = await prisma.recording.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RecordingFindFirstOrThrowArgs>(args?: SelectSubset<T, RecordingFindFirstOrThrowArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Recordings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Recordings
     * const recordings = await prisma.recording.findMany()
     * 
     * // Get first 10 Recordings
     * const recordings = await prisma.recording.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const recordingWithIdOnly = await prisma.recording.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RecordingFindManyArgs>(args?: SelectSubset<T, RecordingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Recording.
     * @param {RecordingCreateArgs} args - Arguments to create a Recording.
     * @example
     * // Create one Recording
     * const Recording = await prisma.recording.create({
     *   data: {
     *     // ... data to create a Recording
     *   }
     * })
     * 
     */
    create<T extends RecordingCreateArgs>(args: SelectSubset<T, RecordingCreateArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Recordings.
     * @param {RecordingCreateManyArgs} args - Arguments to create many Recordings.
     * @example
     * // Create many Recordings
     * const recording = await prisma.recording.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RecordingCreateManyArgs>(args?: SelectSubset<T, RecordingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Recordings and returns the data saved in the database.
     * @param {RecordingCreateManyAndReturnArgs} args - Arguments to create many Recordings.
     * @example
     * // Create many Recordings
     * const recording = await prisma.recording.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Recordings and only return the `id`
     * const recordingWithIdOnly = await prisma.recording.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RecordingCreateManyAndReturnArgs>(args?: SelectSubset<T, RecordingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Recording.
     * @param {RecordingDeleteArgs} args - Arguments to delete one Recording.
     * @example
     * // Delete one Recording
     * const Recording = await prisma.recording.delete({
     *   where: {
     *     // ... filter to delete one Recording
     *   }
     * })
     * 
     */
    delete<T extends RecordingDeleteArgs>(args: SelectSubset<T, RecordingDeleteArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Recording.
     * @param {RecordingUpdateArgs} args - Arguments to update one Recording.
     * @example
     * // Update one Recording
     * const recording = await prisma.recording.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RecordingUpdateArgs>(args: SelectSubset<T, RecordingUpdateArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Recordings.
     * @param {RecordingDeleteManyArgs} args - Arguments to filter Recordings to delete.
     * @example
     * // Delete a few Recordings
     * const { count } = await prisma.recording.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RecordingDeleteManyArgs>(args?: SelectSubset<T, RecordingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Recordings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Recordings
     * const recording = await prisma.recording.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RecordingUpdateManyArgs>(args: SelectSubset<T, RecordingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Recordings and returns the data updated in the database.
     * @param {RecordingUpdateManyAndReturnArgs} args - Arguments to update many Recordings.
     * @example
     * // Update many Recordings
     * const recording = await prisma.recording.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Recordings and only return the `id`
     * const recordingWithIdOnly = await prisma.recording.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RecordingUpdateManyAndReturnArgs>(args: SelectSubset<T, RecordingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Recording.
     * @param {RecordingUpsertArgs} args - Arguments to update or create a Recording.
     * @example
     * // Update or create a Recording
     * const recording = await prisma.recording.upsert({
     *   create: {
     *     // ... data to create a Recording
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Recording we want to update
     *   }
     * })
     */
    upsert<T extends RecordingUpsertArgs>(args: SelectSubset<T, RecordingUpsertArgs<ExtArgs>>): Prisma__RecordingClient<$Result.GetResult<Prisma.$RecordingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Recordings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingCountArgs} args - Arguments to filter Recordings to count.
     * @example
     * // Count the number of Recordings
     * const count = await prisma.recording.count({
     *   where: {
     *     // ... the filter for the Recordings we want to count
     *   }
     * })
    **/
    count<T extends RecordingCountArgs>(
      args?: Subset<T, RecordingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RecordingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Recording.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RecordingAggregateArgs>(args: Subset<T, RecordingAggregateArgs>): Prisma.PrismaPromise<GetRecordingAggregateType<T>>

    /**
     * Group by Recording.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RecordingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RecordingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RecordingGroupByArgs['orderBy'] }
        : { orderBy?: RecordingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RecordingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRecordingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Recording model
   */
  readonly fields: RecordingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Recording.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RecordingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    meeting<T extends MeetingDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MeetingDefaultArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Recording model
   */
  interface RecordingFieldRefs {
    readonly id: FieldRef<"Recording", 'String'>
    readonly meetingId: FieldRef<"Recording", 'String'>
    readonly title: FieldRef<"Recording", 'String'>
    readonly s3Url: FieldRef<"Recording", 'String'>
    readonly duration: FieldRef<"Recording", 'Int'>
    readonly createdAt: FieldRef<"Recording", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Recording findUnique
   */
  export type RecordingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter, which Recording to fetch.
     */
    where: RecordingWhereUniqueInput
  }

  /**
   * Recording findUniqueOrThrow
   */
  export type RecordingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter, which Recording to fetch.
     */
    where: RecordingWhereUniqueInput
  }

  /**
   * Recording findFirst
   */
  export type RecordingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter, which Recording to fetch.
     */
    where?: RecordingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Recordings to fetch.
     */
    orderBy?: RecordingOrderByWithRelationInput | RecordingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Recordings.
     */
    cursor?: RecordingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Recordings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Recordings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Recordings.
     */
    distinct?: RecordingScalarFieldEnum | RecordingScalarFieldEnum[]
  }

  /**
   * Recording findFirstOrThrow
   */
  export type RecordingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter, which Recording to fetch.
     */
    where?: RecordingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Recordings to fetch.
     */
    orderBy?: RecordingOrderByWithRelationInput | RecordingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Recordings.
     */
    cursor?: RecordingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Recordings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Recordings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Recordings.
     */
    distinct?: RecordingScalarFieldEnum | RecordingScalarFieldEnum[]
  }

  /**
   * Recording findMany
   */
  export type RecordingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter, which Recordings to fetch.
     */
    where?: RecordingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Recordings to fetch.
     */
    orderBy?: RecordingOrderByWithRelationInput | RecordingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Recordings.
     */
    cursor?: RecordingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Recordings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Recordings.
     */
    skip?: number
    distinct?: RecordingScalarFieldEnum | RecordingScalarFieldEnum[]
  }

  /**
   * Recording create
   */
  export type RecordingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * The data needed to create a Recording.
     */
    data: XOR<RecordingCreateInput, RecordingUncheckedCreateInput>
  }

  /**
   * Recording createMany
   */
  export type RecordingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Recordings.
     */
    data: RecordingCreateManyInput | RecordingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Recording createManyAndReturn
   */
  export type RecordingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * The data used to create many Recordings.
     */
    data: RecordingCreateManyInput | RecordingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Recording update
   */
  export type RecordingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * The data needed to update a Recording.
     */
    data: XOR<RecordingUpdateInput, RecordingUncheckedUpdateInput>
    /**
     * Choose, which Recording to update.
     */
    where: RecordingWhereUniqueInput
  }

  /**
   * Recording updateMany
   */
  export type RecordingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Recordings.
     */
    data: XOR<RecordingUpdateManyMutationInput, RecordingUncheckedUpdateManyInput>
    /**
     * Filter which Recordings to update
     */
    where?: RecordingWhereInput
    /**
     * Limit how many Recordings to update.
     */
    limit?: number
  }

  /**
   * Recording updateManyAndReturn
   */
  export type RecordingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * The data used to update Recordings.
     */
    data: XOR<RecordingUpdateManyMutationInput, RecordingUncheckedUpdateManyInput>
    /**
     * Filter which Recordings to update
     */
    where?: RecordingWhereInput
    /**
     * Limit how many Recordings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Recording upsert
   */
  export type RecordingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * The filter to search for the Recording to update in case it exists.
     */
    where: RecordingWhereUniqueInput
    /**
     * In case the Recording found by the `where` argument doesn't exist, create a new Recording with this data.
     */
    create: XOR<RecordingCreateInput, RecordingUncheckedCreateInput>
    /**
     * In case the Recording was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RecordingUpdateInput, RecordingUncheckedUpdateInput>
  }

  /**
   * Recording delete
   */
  export type RecordingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
    /**
     * Filter which Recording to delete.
     */
    where: RecordingWhereUniqueInput
  }

  /**
   * Recording deleteMany
   */
  export type RecordingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Recordings to delete
     */
    where?: RecordingWhereInput
    /**
     * Limit how many Recordings to delete.
     */
    limit?: number
  }

  /**
   * Recording without action
   */
  export type RecordingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Recording
     */
    select?: RecordingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Recording
     */
    omit?: RecordingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RecordingInclude<ExtArgs> | null
  }


  /**
   * Model MeetingNote
   */

  export type AggregateMeetingNote = {
    _count: MeetingNoteCountAggregateOutputType | null
    _min: MeetingNoteMinAggregateOutputType | null
    _max: MeetingNoteMaxAggregateOutputType | null
  }

  export type MeetingNoteMinAggregateOutputType = {
    id: string | null
    meetingId: string | null
    content: string | null
    createdAt: Date | null
  }

  export type MeetingNoteMaxAggregateOutputType = {
    id: string | null
    meetingId: string | null
    content: string | null
    createdAt: Date | null
  }

  export type MeetingNoteCountAggregateOutputType = {
    id: number
    meetingId: number
    content: number
    createdAt: number
    _all: number
  }


  export type MeetingNoteMinAggregateInputType = {
    id?: true
    meetingId?: true
    content?: true
    createdAt?: true
  }

  export type MeetingNoteMaxAggregateInputType = {
    id?: true
    meetingId?: true
    content?: true
    createdAt?: true
  }

  export type MeetingNoteCountAggregateInputType = {
    id?: true
    meetingId?: true
    content?: true
    createdAt?: true
    _all?: true
  }

  export type MeetingNoteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MeetingNote to aggregate.
     */
    where?: MeetingNoteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MeetingNotes to fetch.
     */
    orderBy?: MeetingNoteOrderByWithRelationInput | MeetingNoteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MeetingNoteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MeetingNotes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MeetingNotes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MeetingNotes
    **/
    _count?: true | MeetingNoteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MeetingNoteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MeetingNoteMaxAggregateInputType
  }

  export type GetMeetingNoteAggregateType<T extends MeetingNoteAggregateArgs> = {
        [P in keyof T & keyof AggregateMeetingNote]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMeetingNote[P]>
      : GetScalarType<T[P], AggregateMeetingNote[P]>
  }




  export type MeetingNoteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MeetingNoteWhereInput
    orderBy?: MeetingNoteOrderByWithAggregationInput | MeetingNoteOrderByWithAggregationInput[]
    by: MeetingNoteScalarFieldEnum[] | MeetingNoteScalarFieldEnum
    having?: MeetingNoteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MeetingNoteCountAggregateInputType | true
    _min?: MeetingNoteMinAggregateInputType
    _max?: MeetingNoteMaxAggregateInputType
  }

  export type MeetingNoteGroupByOutputType = {
    id: string
    meetingId: string
    content: string
    createdAt: Date
    _count: MeetingNoteCountAggregateOutputType | null
    _min: MeetingNoteMinAggregateOutputType | null
    _max: MeetingNoteMaxAggregateOutputType | null
  }

  type GetMeetingNoteGroupByPayload<T extends MeetingNoteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MeetingNoteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MeetingNoteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MeetingNoteGroupByOutputType[P]>
            : GetScalarType<T[P], MeetingNoteGroupByOutputType[P]>
        }
      >
    >


  export type MeetingNoteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    content?: boolean
    createdAt?: boolean
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["meetingNote"]>

  export type MeetingNoteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    content?: boolean
    createdAt?: boolean
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["meetingNote"]>

  export type MeetingNoteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meetingId?: boolean
    content?: boolean
    createdAt?: boolean
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["meetingNote"]>

  export type MeetingNoteSelectScalar = {
    id?: boolean
    meetingId?: boolean
    content?: boolean
    createdAt?: boolean
  }

  export type MeetingNoteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "meetingId" | "content" | "createdAt", ExtArgs["result"]["meetingNote"]>
  export type MeetingNoteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }
  export type MeetingNoteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }
  export type MeetingNoteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Meeting?: boolean | MeetingDefaultArgs<ExtArgs>
  }

  export type $MeetingNotePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MeetingNote"
    objects: {
      Meeting: Prisma.$MeetingPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      meetingId: string
      content: string
      createdAt: Date
    }, ExtArgs["result"]["meetingNote"]>
    composites: {}
  }

  type MeetingNoteGetPayload<S extends boolean | null | undefined | MeetingNoteDefaultArgs> = $Result.GetResult<Prisma.$MeetingNotePayload, S>

  type MeetingNoteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MeetingNoteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MeetingNoteCountAggregateInputType | true
    }

  export interface MeetingNoteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MeetingNote'], meta: { name: 'MeetingNote' } }
    /**
     * Find zero or one MeetingNote that matches the filter.
     * @param {MeetingNoteFindUniqueArgs} args - Arguments to find a MeetingNote
     * @example
     * // Get one MeetingNote
     * const meetingNote = await prisma.meetingNote.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MeetingNoteFindUniqueArgs>(args: SelectSubset<T, MeetingNoteFindUniqueArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MeetingNote that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MeetingNoteFindUniqueOrThrowArgs} args - Arguments to find a MeetingNote
     * @example
     * // Get one MeetingNote
     * const meetingNote = await prisma.meetingNote.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MeetingNoteFindUniqueOrThrowArgs>(args: SelectSubset<T, MeetingNoteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MeetingNote that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteFindFirstArgs} args - Arguments to find a MeetingNote
     * @example
     * // Get one MeetingNote
     * const meetingNote = await prisma.meetingNote.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MeetingNoteFindFirstArgs>(args?: SelectSubset<T, MeetingNoteFindFirstArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MeetingNote that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteFindFirstOrThrowArgs} args - Arguments to find a MeetingNote
     * @example
     * // Get one MeetingNote
     * const meetingNote = await prisma.meetingNote.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MeetingNoteFindFirstOrThrowArgs>(args?: SelectSubset<T, MeetingNoteFindFirstOrThrowArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MeetingNotes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MeetingNotes
     * const meetingNotes = await prisma.meetingNote.findMany()
     * 
     * // Get first 10 MeetingNotes
     * const meetingNotes = await prisma.meetingNote.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const meetingNoteWithIdOnly = await prisma.meetingNote.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MeetingNoteFindManyArgs>(args?: SelectSubset<T, MeetingNoteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MeetingNote.
     * @param {MeetingNoteCreateArgs} args - Arguments to create a MeetingNote.
     * @example
     * // Create one MeetingNote
     * const MeetingNote = await prisma.meetingNote.create({
     *   data: {
     *     // ... data to create a MeetingNote
     *   }
     * })
     * 
     */
    create<T extends MeetingNoteCreateArgs>(args: SelectSubset<T, MeetingNoteCreateArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MeetingNotes.
     * @param {MeetingNoteCreateManyArgs} args - Arguments to create many MeetingNotes.
     * @example
     * // Create many MeetingNotes
     * const meetingNote = await prisma.meetingNote.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MeetingNoteCreateManyArgs>(args?: SelectSubset<T, MeetingNoteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MeetingNotes and returns the data saved in the database.
     * @param {MeetingNoteCreateManyAndReturnArgs} args - Arguments to create many MeetingNotes.
     * @example
     * // Create many MeetingNotes
     * const meetingNote = await prisma.meetingNote.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MeetingNotes and only return the `id`
     * const meetingNoteWithIdOnly = await prisma.meetingNote.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MeetingNoteCreateManyAndReturnArgs>(args?: SelectSubset<T, MeetingNoteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MeetingNote.
     * @param {MeetingNoteDeleteArgs} args - Arguments to delete one MeetingNote.
     * @example
     * // Delete one MeetingNote
     * const MeetingNote = await prisma.meetingNote.delete({
     *   where: {
     *     // ... filter to delete one MeetingNote
     *   }
     * })
     * 
     */
    delete<T extends MeetingNoteDeleteArgs>(args: SelectSubset<T, MeetingNoteDeleteArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MeetingNote.
     * @param {MeetingNoteUpdateArgs} args - Arguments to update one MeetingNote.
     * @example
     * // Update one MeetingNote
     * const meetingNote = await prisma.meetingNote.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MeetingNoteUpdateArgs>(args: SelectSubset<T, MeetingNoteUpdateArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MeetingNotes.
     * @param {MeetingNoteDeleteManyArgs} args - Arguments to filter MeetingNotes to delete.
     * @example
     * // Delete a few MeetingNotes
     * const { count } = await prisma.meetingNote.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MeetingNoteDeleteManyArgs>(args?: SelectSubset<T, MeetingNoteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MeetingNotes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MeetingNotes
     * const meetingNote = await prisma.meetingNote.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MeetingNoteUpdateManyArgs>(args: SelectSubset<T, MeetingNoteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MeetingNotes and returns the data updated in the database.
     * @param {MeetingNoteUpdateManyAndReturnArgs} args - Arguments to update many MeetingNotes.
     * @example
     * // Update many MeetingNotes
     * const meetingNote = await prisma.meetingNote.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MeetingNotes and only return the `id`
     * const meetingNoteWithIdOnly = await prisma.meetingNote.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MeetingNoteUpdateManyAndReturnArgs>(args: SelectSubset<T, MeetingNoteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MeetingNote.
     * @param {MeetingNoteUpsertArgs} args - Arguments to update or create a MeetingNote.
     * @example
     * // Update or create a MeetingNote
     * const meetingNote = await prisma.meetingNote.upsert({
     *   create: {
     *     // ... data to create a MeetingNote
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MeetingNote we want to update
     *   }
     * })
     */
    upsert<T extends MeetingNoteUpsertArgs>(args: SelectSubset<T, MeetingNoteUpsertArgs<ExtArgs>>): Prisma__MeetingNoteClient<$Result.GetResult<Prisma.$MeetingNotePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MeetingNotes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteCountArgs} args - Arguments to filter MeetingNotes to count.
     * @example
     * // Count the number of MeetingNotes
     * const count = await prisma.meetingNote.count({
     *   where: {
     *     // ... the filter for the MeetingNotes we want to count
     *   }
     * })
    **/
    count<T extends MeetingNoteCountArgs>(
      args?: Subset<T, MeetingNoteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MeetingNoteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MeetingNote.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MeetingNoteAggregateArgs>(args: Subset<T, MeetingNoteAggregateArgs>): Prisma.PrismaPromise<GetMeetingNoteAggregateType<T>>

    /**
     * Group by MeetingNote.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MeetingNoteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MeetingNoteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MeetingNoteGroupByArgs['orderBy'] }
        : { orderBy?: MeetingNoteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MeetingNoteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMeetingNoteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MeetingNote model
   */
  readonly fields: MeetingNoteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MeetingNote.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MeetingNoteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    Meeting<T extends MeetingDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MeetingDefaultArgs<ExtArgs>>): Prisma__MeetingClient<$Result.GetResult<Prisma.$MeetingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MeetingNote model
   */
  interface MeetingNoteFieldRefs {
    readonly id: FieldRef<"MeetingNote", 'String'>
    readonly meetingId: FieldRef<"MeetingNote", 'String'>
    readonly content: FieldRef<"MeetingNote", 'String'>
    readonly createdAt: FieldRef<"MeetingNote", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MeetingNote findUnique
   */
  export type MeetingNoteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter, which MeetingNote to fetch.
     */
    where: MeetingNoteWhereUniqueInput
  }

  /**
   * MeetingNote findUniqueOrThrow
   */
  export type MeetingNoteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter, which MeetingNote to fetch.
     */
    where: MeetingNoteWhereUniqueInput
  }

  /**
   * MeetingNote findFirst
   */
  export type MeetingNoteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter, which MeetingNote to fetch.
     */
    where?: MeetingNoteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MeetingNotes to fetch.
     */
    orderBy?: MeetingNoteOrderByWithRelationInput | MeetingNoteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MeetingNotes.
     */
    cursor?: MeetingNoteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MeetingNotes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MeetingNotes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MeetingNotes.
     */
    distinct?: MeetingNoteScalarFieldEnum | MeetingNoteScalarFieldEnum[]
  }

  /**
   * MeetingNote findFirstOrThrow
   */
  export type MeetingNoteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter, which MeetingNote to fetch.
     */
    where?: MeetingNoteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MeetingNotes to fetch.
     */
    orderBy?: MeetingNoteOrderByWithRelationInput | MeetingNoteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MeetingNotes.
     */
    cursor?: MeetingNoteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MeetingNotes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MeetingNotes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MeetingNotes.
     */
    distinct?: MeetingNoteScalarFieldEnum | MeetingNoteScalarFieldEnum[]
  }

  /**
   * MeetingNote findMany
   */
  export type MeetingNoteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter, which MeetingNotes to fetch.
     */
    where?: MeetingNoteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MeetingNotes to fetch.
     */
    orderBy?: MeetingNoteOrderByWithRelationInput | MeetingNoteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MeetingNotes.
     */
    cursor?: MeetingNoteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MeetingNotes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MeetingNotes.
     */
    skip?: number
    distinct?: MeetingNoteScalarFieldEnum | MeetingNoteScalarFieldEnum[]
  }

  /**
   * MeetingNote create
   */
  export type MeetingNoteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * The data needed to create a MeetingNote.
     */
    data: XOR<MeetingNoteCreateInput, MeetingNoteUncheckedCreateInput>
  }

  /**
   * MeetingNote createMany
   */
  export type MeetingNoteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MeetingNotes.
     */
    data: MeetingNoteCreateManyInput | MeetingNoteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MeetingNote createManyAndReturn
   */
  export type MeetingNoteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * The data used to create many MeetingNotes.
     */
    data: MeetingNoteCreateManyInput | MeetingNoteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MeetingNote update
   */
  export type MeetingNoteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * The data needed to update a MeetingNote.
     */
    data: XOR<MeetingNoteUpdateInput, MeetingNoteUncheckedUpdateInput>
    /**
     * Choose, which MeetingNote to update.
     */
    where: MeetingNoteWhereUniqueInput
  }

  /**
   * MeetingNote updateMany
   */
  export type MeetingNoteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MeetingNotes.
     */
    data: XOR<MeetingNoteUpdateManyMutationInput, MeetingNoteUncheckedUpdateManyInput>
    /**
     * Filter which MeetingNotes to update
     */
    where?: MeetingNoteWhereInput
    /**
     * Limit how many MeetingNotes to update.
     */
    limit?: number
  }

  /**
   * MeetingNote updateManyAndReturn
   */
  export type MeetingNoteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * The data used to update MeetingNotes.
     */
    data: XOR<MeetingNoteUpdateManyMutationInput, MeetingNoteUncheckedUpdateManyInput>
    /**
     * Filter which MeetingNotes to update
     */
    where?: MeetingNoteWhereInput
    /**
     * Limit how many MeetingNotes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * MeetingNote upsert
   */
  export type MeetingNoteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * The filter to search for the MeetingNote to update in case it exists.
     */
    where: MeetingNoteWhereUniqueInput
    /**
     * In case the MeetingNote found by the `where` argument doesn't exist, create a new MeetingNote with this data.
     */
    create: XOR<MeetingNoteCreateInput, MeetingNoteUncheckedCreateInput>
    /**
     * In case the MeetingNote was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MeetingNoteUpdateInput, MeetingNoteUncheckedUpdateInput>
  }

  /**
   * MeetingNote delete
   */
  export type MeetingNoteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
    /**
     * Filter which MeetingNote to delete.
     */
    where: MeetingNoteWhereUniqueInput
  }

  /**
   * MeetingNote deleteMany
   */
  export type MeetingNoteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MeetingNotes to delete
     */
    where?: MeetingNoteWhereInput
    /**
     * Limit how many MeetingNotes to delete.
     */
    limit?: number
  }

  /**
   * MeetingNote without action
   */
  export type MeetingNoteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MeetingNote
     */
    select?: MeetingNoteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MeetingNote
     */
    omit?: MeetingNoteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MeetingNoteInclude<ExtArgs> | null
  }


  /**
   * Model meeting_rooms
   */

  export type AggregateMeeting_rooms = {
    _count: Meeting_roomsCountAggregateOutputType | null
    _min: Meeting_roomsMinAggregateOutputType | null
    _max: Meeting_roomsMaxAggregateOutputType | null
  }

  export type Meeting_roomsMinAggregateOutputType = {
    id: string | null
    meeting_code: string | null
    title: string | null
    scheduledFor: Date | null
    notes: string | null
    status: string | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Meeting_roomsMaxAggregateOutputType = {
    id: string | null
    meeting_code: string | null
    title: string | null
    scheduledFor: Date | null
    notes: string | null
    status: string | null
    is_active: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Meeting_roomsCountAggregateOutputType = {
    id: number
    meeting_code: number
    title: number
    scheduledFor: number
    attendees: number
    notes: number
    status: number
    is_active: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Meeting_roomsMinAggregateInputType = {
    id?: true
    meeting_code?: true
    title?: true
    scheduledFor?: true
    notes?: true
    status?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Meeting_roomsMaxAggregateInputType = {
    id?: true
    meeting_code?: true
    title?: true
    scheduledFor?: true
    notes?: true
    status?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Meeting_roomsCountAggregateInputType = {
    id?: true
    meeting_code?: true
    title?: true
    scheduledFor?: true
    attendees?: true
    notes?: true
    status?: true
    is_active?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Meeting_roomsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which meeting_rooms to aggregate.
     */
    where?: meeting_roomsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of meeting_rooms to fetch.
     */
    orderBy?: meeting_roomsOrderByWithRelationInput | meeting_roomsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: meeting_roomsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` meeting_rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` meeting_rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned meeting_rooms
    **/
    _count?: true | Meeting_roomsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Meeting_roomsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Meeting_roomsMaxAggregateInputType
  }

  export type GetMeeting_roomsAggregateType<T extends Meeting_roomsAggregateArgs> = {
        [P in keyof T & keyof AggregateMeeting_rooms]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMeeting_rooms[P]>
      : GetScalarType<T[P], AggregateMeeting_rooms[P]>
  }




  export type meeting_roomsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: meeting_roomsWhereInput
    orderBy?: meeting_roomsOrderByWithAggregationInput | meeting_roomsOrderByWithAggregationInput[]
    by: Meeting_roomsScalarFieldEnum[] | Meeting_roomsScalarFieldEnum
    having?: meeting_roomsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Meeting_roomsCountAggregateInputType | true
    _min?: Meeting_roomsMinAggregateInputType
    _max?: Meeting_roomsMaxAggregateInputType
  }

  export type Meeting_roomsGroupByOutputType = {
    id: string
    meeting_code: string
    title: string
    scheduledFor: Date
    attendees: JsonValue
    notes: string | null
    status: string
    is_active: boolean
    created_at: Date
    updated_at: Date
    _count: Meeting_roomsCountAggregateOutputType | null
    _min: Meeting_roomsMinAggregateOutputType | null
    _max: Meeting_roomsMaxAggregateOutputType | null
  }

  type GetMeeting_roomsGroupByPayload<T extends meeting_roomsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Meeting_roomsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Meeting_roomsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Meeting_roomsGroupByOutputType[P]>
            : GetScalarType<T[P], Meeting_roomsGroupByOutputType[P]>
        }
      >
    >


  export type meeting_roomsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meeting_code?: boolean
    title?: boolean
    scheduledFor?: boolean
    attendees?: boolean
    notes?: boolean
    status?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["meeting_rooms"]>

  export type meeting_roomsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meeting_code?: boolean
    title?: boolean
    scheduledFor?: boolean
    attendees?: boolean
    notes?: boolean
    status?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["meeting_rooms"]>

  export type meeting_roomsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    meeting_code?: boolean
    title?: boolean
    scheduledFor?: boolean
    attendees?: boolean
    notes?: boolean
    status?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["meeting_rooms"]>

  export type meeting_roomsSelectScalar = {
    id?: boolean
    meeting_code?: boolean
    title?: boolean
    scheduledFor?: boolean
    attendees?: boolean
    notes?: boolean
    status?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type meeting_roomsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "meeting_code" | "title" | "scheduledFor" | "attendees" | "notes" | "status" | "is_active" | "created_at" | "updated_at", ExtArgs["result"]["meeting_rooms"]>

  export type $meeting_roomsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "meeting_rooms"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      meeting_code: string
      title: string
      scheduledFor: Date
      attendees: Prisma.JsonValue
      notes: string | null
      status: string
      is_active: boolean
      created_at: Date
      updated_at: Date
    }, ExtArgs["result"]["meeting_rooms"]>
    composites: {}
  }

  type meeting_roomsGetPayload<S extends boolean | null | undefined | meeting_roomsDefaultArgs> = $Result.GetResult<Prisma.$meeting_roomsPayload, S>

  type meeting_roomsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<meeting_roomsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Meeting_roomsCountAggregateInputType | true
    }

  export interface meeting_roomsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['meeting_rooms'], meta: { name: 'meeting_rooms' } }
    /**
     * Find zero or one Meeting_rooms that matches the filter.
     * @param {meeting_roomsFindUniqueArgs} args - Arguments to find a Meeting_rooms
     * @example
     * // Get one Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends meeting_roomsFindUniqueArgs>(args: SelectSubset<T, meeting_roomsFindUniqueArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Meeting_rooms that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {meeting_roomsFindUniqueOrThrowArgs} args - Arguments to find a Meeting_rooms
     * @example
     * // Get one Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends meeting_roomsFindUniqueOrThrowArgs>(args: SelectSubset<T, meeting_roomsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Meeting_rooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsFindFirstArgs} args - Arguments to find a Meeting_rooms
     * @example
     * // Get one Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends meeting_roomsFindFirstArgs>(args?: SelectSubset<T, meeting_roomsFindFirstArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Meeting_rooms that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsFindFirstOrThrowArgs} args - Arguments to find a Meeting_rooms
     * @example
     * // Get one Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends meeting_roomsFindFirstOrThrowArgs>(args?: SelectSubset<T, meeting_roomsFindFirstOrThrowArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Meeting_rooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findMany()
     * 
     * // Get first 10 Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const meeting_roomsWithIdOnly = await prisma.meeting_rooms.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends meeting_roomsFindManyArgs>(args?: SelectSubset<T, meeting_roomsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Meeting_rooms.
     * @param {meeting_roomsCreateArgs} args - Arguments to create a Meeting_rooms.
     * @example
     * // Create one Meeting_rooms
     * const Meeting_rooms = await prisma.meeting_rooms.create({
     *   data: {
     *     // ... data to create a Meeting_rooms
     *   }
     * })
     * 
     */
    create<T extends meeting_roomsCreateArgs>(args: SelectSubset<T, meeting_roomsCreateArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Meeting_rooms.
     * @param {meeting_roomsCreateManyArgs} args - Arguments to create many Meeting_rooms.
     * @example
     * // Create many Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends meeting_roomsCreateManyArgs>(args?: SelectSubset<T, meeting_roomsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Meeting_rooms and returns the data saved in the database.
     * @param {meeting_roomsCreateManyAndReturnArgs} args - Arguments to create many Meeting_rooms.
     * @example
     * // Create many Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Meeting_rooms and only return the `id`
     * const meeting_roomsWithIdOnly = await prisma.meeting_rooms.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends meeting_roomsCreateManyAndReturnArgs>(args?: SelectSubset<T, meeting_roomsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Meeting_rooms.
     * @param {meeting_roomsDeleteArgs} args - Arguments to delete one Meeting_rooms.
     * @example
     * // Delete one Meeting_rooms
     * const Meeting_rooms = await prisma.meeting_rooms.delete({
     *   where: {
     *     // ... filter to delete one Meeting_rooms
     *   }
     * })
     * 
     */
    delete<T extends meeting_roomsDeleteArgs>(args: SelectSubset<T, meeting_roomsDeleteArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Meeting_rooms.
     * @param {meeting_roomsUpdateArgs} args - Arguments to update one Meeting_rooms.
     * @example
     * // Update one Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends meeting_roomsUpdateArgs>(args: SelectSubset<T, meeting_roomsUpdateArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Meeting_rooms.
     * @param {meeting_roomsDeleteManyArgs} args - Arguments to filter Meeting_rooms to delete.
     * @example
     * // Delete a few Meeting_rooms
     * const { count } = await prisma.meeting_rooms.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends meeting_roomsDeleteManyArgs>(args?: SelectSubset<T, meeting_roomsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Meeting_rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends meeting_roomsUpdateManyArgs>(args: SelectSubset<T, meeting_roomsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Meeting_rooms and returns the data updated in the database.
     * @param {meeting_roomsUpdateManyAndReturnArgs} args - Arguments to update many Meeting_rooms.
     * @example
     * // Update many Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Meeting_rooms and only return the `id`
     * const meeting_roomsWithIdOnly = await prisma.meeting_rooms.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends meeting_roomsUpdateManyAndReturnArgs>(args: SelectSubset<T, meeting_roomsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Meeting_rooms.
     * @param {meeting_roomsUpsertArgs} args - Arguments to update or create a Meeting_rooms.
     * @example
     * // Update or create a Meeting_rooms
     * const meeting_rooms = await prisma.meeting_rooms.upsert({
     *   create: {
     *     // ... data to create a Meeting_rooms
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Meeting_rooms we want to update
     *   }
     * })
     */
    upsert<T extends meeting_roomsUpsertArgs>(args: SelectSubset<T, meeting_roomsUpsertArgs<ExtArgs>>): Prisma__meeting_roomsClient<$Result.GetResult<Prisma.$meeting_roomsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Meeting_rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsCountArgs} args - Arguments to filter Meeting_rooms to count.
     * @example
     * // Count the number of Meeting_rooms
     * const count = await prisma.meeting_rooms.count({
     *   where: {
     *     // ... the filter for the Meeting_rooms we want to count
     *   }
     * })
    **/
    count<T extends meeting_roomsCountArgs>(
      args?: Subset<T, meeting_roomsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Meeting_roomsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Meeting_rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Meeting_roomsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Meeting_roomsAggregateArgs>(args: Subset<T, Meeting_roomsAggregateArgs>): Prisma.PrismaPromise<GetMeeting_roomsAggregateType<T>>

    /**
     * Group by Meeting_rooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {meeting_roomsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends meeting_roomsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: meeting_roomsGroupByArgs['orderBy'] }
        : { orderBy?: meeting_roomsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, meeting_roomsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMeeting_roomsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the meeting_rooms model
   */
  readonly fields: meeting_roomsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for meeting_rooms.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__meeting_roomsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the meeting_rooms model
   */
  interface meeting_roomsFieldRefs {
    readonly id: FieldRef<"meeting_rooms", 'String'>
    readonly meeting_code: FieldRef<"meeting_rooms", 'String'>
    readonly title: FieldRef<"meeting_rooms", 'String'>
    readonly scheduledFor: FieldRef<"meeting_rooms", 'DateTime'>
    readonly attendees: FieldRef<"meeting_rooms", 'Json'>
    readonly notes: FieldRef<"meeting_rooms", 'String'>
    readonly status: FieldRef<"meeting_rooms", 'String'>
    readonly is_active: FieldRef<"meeting_rooms", 'Boolean'>
    readonly created_at: FieldRef<"meeting_rooms", 'DateTime'>
    readonly updated_at: FieldRef<"meeting_rooms", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * meeting_rooms findUnique
   */
  export type meeting_roomsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter, which meeting_rooms to fetch.
     */
    where: meeting_roomsWhereUniqueInput
  }

  /**
   * meeting_rooms findUniqueOrThrow
   */
  export type meeting_roomsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter, which meeting_rooms to fetch.
     */
    where: meeting_roomsWhereUniqueInput
  }

  /**
   * meeting_rooms findFirst
   */
  export type meeting_roomsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter, which meeting_rooms to fetch.
     */
    where?: meeting_roomsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of meeting_rooms to fetch.
     */
    orderBy?: meeting_roomsOrderByWithRelationInput | meeting_roomsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for meeting_rooms.
     */
    cursor?: meeting_roomsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` meeting_rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` meeting_rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of meeting_rooms.
     */
    distinct?: Meeting_roomsScalarFieldEnum | Meeting_roomsScalarFieldEnum[]
  }

  /**
   * meeting_rooms findFirstOrThrow
   */
  export type meeting_roomsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter, which meeting_rooms to fetch.
     */
    where?: meeting_roomsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of meeting_rooms to fetch.
     */
    orderBy?: meeting_roomsOrderByWithRelationInput | meeting_roomsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for meeting_rooms.
     */
    cursor?: meeting_roomsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` meeting_rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` meeting_rooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of meeting_rooms.
     */
    distinct?: Meeting_roomsScalarFieldEnum | Meeting_roomsScalarFieldEnum[]
  }

  /**
   * meeting_rooms findMany
   */
  export type meeting_roomsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter, which meeting_rooms to fetch.
     */
    where?: meeting_roomsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of meeting_rooms to fetch.
     */
    orderBy?: meeting_roomsOrderByWithRelationInput | meeting_roomsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing meeting_rooms.
     */
    cursor?: meeting_roomsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` meeting_rooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` meeting_rooms.
     */
    skip?: number
    distinct?: Meeting_roomsScalarFieldEnum | Meeting_roomsScalarFieldEnum[]
  }

  /**
   * meeting_rooms create
   */
  export type meeting_roomsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * The data needed to create a meeting_rooms.
     */
    data: XOR<meeting_roomsCreateInput, meeting_roomsUncheckedCreateInput>
  }

  /**
   * meeting_rooms createMany
   */
  export type meeting_roomsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many meeting_rooms.
     */
    data: meeting_roomsCreateManyInput | meeting_roomsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * meeting_rooms createManyAndReturn
   */
  export type meeting_roomsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * The data used to create many meeting_rooms.
     */
    data: meeting_roomsCreateManyInput | meeting_roomsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * meeting_rooms update
   */
  export type meeting_roomsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * The data needed to update a meeting_rooms.
     */
    data: XOR<meeting_roomsUpdateInput, meeting_roomsUncheckedUpdateInput>
    /**
     * Choose, which meeting_rooms to update.
     */
    where: meeting_roomsWhereUniqueInput
  }

  /**
   * meeting_rooms updateMany
   */
  export type meeting_roomsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update meeting_rooms.
     */
    data: XOR<meeting_roomsUpdateManyMutationInput, meeting_roomsUncheckedUpdateManyInput>
    /**
     * Filter which meeting_rooms to update
     */
    where?: meeting_roomsWhereInput
    /**
     * Limit how many meeting_rooms to update.
     */
    limit?: number
  }

  /**
   * meeting_rooms updateManyAndReturn
   */
  export type meeting_roomsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * The data used to update meeting_rooms.
     */
    data: XOR<meeting_roomsUpdateManyMutationInput, meeting_roomsUncheckedUpdateManyInput>
    /**
     * Filter which meeting_rooms to update
     */
    where?: meeting_roomsWhereInput
    /**
     * Limit how many meeting_rooms to update.
     */
    limit?: number
  }

  /**
   * meeting_rooms upsert
   */
  export type meeting_roomsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * The filter to search for the meeting_rooms to update in case it exists.
     */
    where: meeting_roomsWhereUniqueInput
    /**
     * In case the meeting_rooms found by the `where` argument doesn't exist, create a new meeting_rooms with this data.
     */
    create: XOR<meeting_roomsCreateInput, meeting_roomsUncheckedCreateInput>
    /**
     * In case the meeting_rooms was found with the provided `where` argument, update it with this data.
     */
    update: XOR<meeting_roomsUpdateInput, meeting_roomsUncheckedUpdateInput>
  }

  /**
   * meeting_rooms delete
   */
  export type meeting_roomsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
    /**
     * Filter which meeting_rooms to delete.
     */
    where: meeting_roomsWhereUniqueInput
  }

  /**
   * meeting_rooms deleteMany
   */
  export type meeting_roomsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which meeting_rooms to delete
     */
    where?: meeting_roomsWhereInput
    /**
     * Limit how many meeting_rooms to delete.
     */
    limit?: number
  }

  /**
   * meeting_rooms without action
   */
  export type meeting_roomsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the meeting_rooms
     */
    select?: meeting_roomsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the meeting_rooms
     */
    omit?: meeting_roomsOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    clerkId: 'clerkId',
    name: 'name',
    email: 'email',
    imageUrl: 'imageUrl',
    role: 'role',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const MeetingScalarFieldEnum: {
    id: 'id',
    code: 'code',
    title: 'title',
    date: 'date',
    scheduledFor: 'scheduledFor',
    startTime: 'startTime',
    endTime: 'endTime',
    durationMins: 'durationMins',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MeetingScalarFieldEnum = (typeof MeetingScalarFieldEnum)[keyof typeof MeetingScalarFieldEnum]


  export const RecordingScalarFieldEnum: {
    id: 'id',
    meetingId: 'meetingId',
    title: 'title',
    s3Url: 's3Url',
    duration: 'duration',
    createdAt: 'createdAt'
  };

  export type RecordingScalarFieldEnum = (typeof RecordingScalarFieldEnum)[keyof typeof RecordingScalarFieldEnum]


  export const MeetingNoteScalarFieldEnum: {
    id: 'id',
    meetingId: 'meetingId',
    content: 'content',
    createdAt: 'createdAt'
  };

  export type MeetingNoteScalarFieldEnum = (typeof MeetingNoteScalarFieldEnum)[keyof typeof MeetingNoteScalarFieldEnum]


  export const Meeting_roomsScalarFieldEnum: {
    id: 'id',
    meeting_code: 'meeting_code',
    title: 'title',
    scheduledFor: 'scheduledFor',
    attendees: 'attendees',
    notes: 'notes',
    status: 'status',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Meeting_roomsScalarFieldEnum = (typeof Meeting_roomsScalarFieldEnum)[keyof typeof Meeting_roomsScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    clerkId?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    email?: StringNullableFilter<"User"> | string | null
    imageUrl?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    clerkId?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    imageUrl?: SortOrderInput | SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    clerkId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringNullableFilter<"User"> | string | null
    email?: StringNullableFilter<"User"> | string | null
    imageUrl?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
  }, "id" | "clerkId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    clerkId?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    imageUrl?: SortOrderInput | SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    clerkId?: StringWithAggregatesFilter<"User"> | string
    name?: StringNullableWithAggregatesFilter<"User"> | string | null
    email?: StringNullableWithAggregatesFilter<"User"> | string | null
    imageUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type MeetingWhereInput = {
    AND?: MeetingWhereInput | MeetingWhereInput[]
    OR?: MeetingWhereInput[]
    NOT?: MeetingWhereInput | MeetingWhereInput[]
    id?: StringFilter<"Meeting"> | string
    code?: StringFilter<"Meeting"> | string
    title?: StringFilter<"Meeting"> | string
    date?: DateTimeFilter<"Meeting"> | Date | string
    scheduledFor?: DateTimeFilter<"Meeting"> | Date | string
    startTime?: DateTimeFilter<"Meeting"> | Date | string
    endTime?: DateTimeFilter<"Meeting"> | Date | string
    durationMins?: IntFilter<"Meeting"> | number
    createdAt?: DateTimeFilter<"Meeting"> | Date | string
    updatedAt?: DateTimeFilter<"Meeting"> | Date | string
    MeetingNote?: MeetingNoteListRelationFilter
    recordings?: RecordingListRelationFilter
  }

  export type MeetingOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    title?: SortOrder
    date?: SortOrder
    scheduledFor?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    durationMins?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    MeetingNote?: MeetingNoteOrderByRelationAggregateInput
    recordings?: RecordingOrderByRelationAggregateInput
  }

  export type MeetingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: MeetingWhereInput | MeetingWhereInput[]
    OR?: MeetingWhereInput[]
    NOT?: MeetingWhereInput | MeetingWhereInput[]
    title?: StringFilter<"Meeting"> | string
    date?: DateTimeFilter<"Meeting"> | Date | string
    scheduledFor?: DateTimeFilter<"Meeting"> | Date | string
    startTime?: DateTimeFilter<"Meeting"> | Date | string
    endTime?: DateTimeFilter<"Meeting"> | Date | string
    durationMins?: IntFilter<"Meeting"> | number
    createdAt?: DateTimeFilter<"Meeting"> | Date | string
    updatedAt?: DateTimeFilter<"Meeting"> | Date | string
    MeetingNote?: MeetingNoteListRelationFilter
    recordings?: RecordingListRelationFilter
  }, "id" | "code">

  export type MeetingOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    title?: SortOrder
    date?: SortOrder
    scheduledFor?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    durationMins?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MeetingCountOrderByAggregateInput
    _avg?: MeetingAvgOrderByAggregateInput
    _max?: MeetingMaxOrderByAggregateInput
    _min?: MeetingMinOrderByAggregateInput
    _sum?: MeetingSumOrderByAggregateInput
  }

  export type MeetingScalarWhereWithAggregatesInput = {
    AND?: MeetingScalarWhereWithAggregatesInput | MeetingScalarWhereWithAggregatesInput[]
    OR?: MeetingScalarWhereWithAggregatesInput[]
    NOT?: MeetingScalarWhereWithAggregatesInput | MeetingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Meeting"> | string
    code?: StringWithAggregatesFilter<"Meeting"> | string
    title?: StringWithAggregatesFilter<"Meeting"> | string
    date?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
    scheduledFor?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
    startTime?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
    endTime?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
    durationMins?: IntWithAggregatesFilter<"Meeting"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Meeting"> | Date | string
  }

  export type RecordingWhereInput = {
    AND?: RecordingWhereInput | RecordingWhereInput[]
    OR?: RecordingWhereInput[]
    NOT?: RecordingWhereInput | RecordingWhereInput[]
    id?: StringFilter<"Recording"> | string
    meetingId?: StringFilter<"Recording"> | string
    title?: StringFilter<"Recording"> | string
    s3Url?: StringFilter<"Recording"> | string
    duration?: IntNullableFilter<"Recording"> | number | null
    createdAt?: DateTimeFilter<"Recording"> | Date | string
    meeting?: XOR<MeetingScalarRelationFilter, MeetingWhereInput>
  }

  export type RecordingOrderByWithRelationInput = {
    id?: SortOrder
    meetingId?: SortOrder
    title?: SortOrder
    s3Url?: SortOrder
    duration?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    meeting?: MeetingOrderByWithRelationInput
  }

  export type RecordingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RecordingWhereInput | RecordingWhereInput[]
    OR?: RecordingWhereInput[]
    NOT?: RecordingWhereInput | RecordingWhereInput[]
    meetingId?: StringFilter<"Recording"> | string
    title?: StringFilter<"Recording"> | string
    s3Url?: StringFilter<"Recording"> | string
    duration?: IntNullableFilter<"Recording"> | number | null
    createdAt?: DateTimeFilter<"Recording"> | Date | string
    meeting?: XOR<MeetingScalarRelationFilter, MeetingWhereInput>
  }, "id">

  export type RecordingOrderByWithAggregationInput = {
    id?: SortOrder
    meetingId?: SortOrder
    title?: SortOrder
    s3Url?: SortOrder
    duration?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RecordingCountOrderByAggregateInput
    _avg?: RecordingAvgOrderByAggregateInput
    _max?: RecordingMaxOrderByAggregateInput
    _min?: RecordingMinOrderByAggregateInput
    _sum?: RecordingSumOrderByAggregateInput
  }

  export type RecordingScalarWhereWithAggregatesInput = {
    AND?: RecordingScalarWhereWithAggregatesInput | RecordingScalarWhereWithAggregatesInput[]
    OR?: RecordingScalarWhereWithAggregatesInput[]
    NOT?: RecordingScalarWhereWithAggregatesInput | RecordingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Recording"> | string
    meetingId?: StringWithAggregatesFilter<"Recording"> | string
    title?: StringWithAggregatesFilter<"Recording"> | string
    s3Url?: StringWithAggregatesFilter<"Recording"> | string
    duration?: IntNullableWithAggregatesFilter<"Recording"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"Recording"> | Date | string
  }

  export type MeetingNoteWhereInput = {
    AND?: MeetingNoteWhereInput | MeetingNoteWhereInput[]
    OR?: MeetingNoteWhereInput[]
    NOT?: MeetingNoteWhereInput | MeetingNoteWhereInput[]
    id?: StringFilter<"MeetingNote"> | string
    meetingId?: StringFilter<"MeetingNote"> | string
    content?: StringFilter<"MeetingNote"> | string
    createdAt?: DateTimeFilter<"MeetingNote"> | Date | string
    Meeting?: XOR<MeetingScalarRelationFilter, MeetingWhereInput>
  }

  export type MeetingNoteOrderByWithRelationInput = {
    id?: SortOrder
    meetingId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    Meeting?: MeetingOrderByWithRelationInput
  }

  export type MeetingNoteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MeetingNoteWhereInput | MeetingNoteWhereInput[]
    OR?: MeetingNoteWhereInput[]
    NOT?: MeetingNoteWhereInput | MeetingNoteWhereInput[]
    meetingId?: StringFilter<"MeetingNote"> | string
    content?: StringFilter<"MeetingNote"> | string
    createdAt?: DateTimeFilter<"MeetingNote"> | Date | string
    Meeting?: XOR<MeetingScalarRelationFilter, MeetingWhereInput>
  }, "id">

  export type MeetingNoteOrderByWithAggregationInput = {
    id?: SortOrder
    meetingId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    _count?: MeetingNoteCountOrderByAggregateInput
    _max?: MeetingNoteMaxOrderByAggregateInput
    _min?: MeetingNoteMinOrderByAggregateInput
  }

  export type MeetingNoteScalarWhereWithAggregatesInput = {
    AND?: MeetingNoteScalarWhereWithAggregatesInput | MeetingNoteScalarWhereWithAggregatesInput[]
    OR?: MeetingNoteScalarWhereWithAggregatesInput[]
    NOT?: MeetingNoteScalarWhereWithAggregatesInput | MeetingNoteScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MeetingNote"> | string
    meetingId?: StringWithAggregatesFilter<"MeetingNote"> | string
    content?: StringWithAggregatesFilter<"MeetingNote"> | string
    createdAt?: DateTimeWithAggregatesFilter<"MeetingNote"> | Date | string
  }

  export type meeting_roomsWhereInput = {
    AND?: meeting_roomsWhereInput | meeting_roomsWhereInput[]
    OR?: meeting_roomsWhereInput[]
    NOT?: meeting_roomsWhereInput | meeting_roomsWhereInput[]
    id?: UuidFilter<"meeting_rooms"> | string
    meeting_code?: StringFilter<"meeting_rooms"> | string
    title?: StringFilter<"meeting_rooms"> | string
    scheduledFor?: DateTimeFilter<"meeting_rooms"> | Date | string
    attendees?: JsonFilter<"meeting_rooms">
    notes?: StringNullableFilter<"meeting_rooms"> | string | null
    status?: StringFilter<"meeting_rooms"> | string
    is_active?: BoolFilter<"meeting_rooms"> | boolean
    created_at?: DateTimeFilter<"meeting_rooms"> | Date | string
    updated_at?: DateTimeFilter<"meeting_rooms"> | Date | string
  }

  export type meeting_roomsOrderByWithRelationInput = {
    id?: SortOrder
    meeting_code?: SortOrder
    title?: SortOrder
    scheduledFor?: SortOrder
    attendees?: SortOrder
    notes?: SortOrderInput | SortOrder
    status?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type meeting_roomsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    meeting_code?: string
    AND?: meeting_roomsWhereInput | meeting_roomsWhereInput[]
    OR?: meeting_roomsWhereInput[]
    NOT?: meeting_roomsWhereInput | meeting_roomsWhereInput[]
    title?: StringFilter<"meeting_rooms"> | string
    scheduledFor?: DateTimeFilter<"meeting_rooms"> | Date | string
    attendees?: JsonFilter<"meeting_rooms">
    notes?: StringNullableFilter<"meeting_rooms"> | string | null
    status?: StringFilter<"meeting_rooms"> | string
    is_active?: BoolFilter<"meeting_rooms"> | boolean
    created_at?: DateTimeFilter<"meeting_rooms"> | Date | string
    updated_at?: DateTimeFilter<"meeting_rooms"> | Date | string
  }, "id" | "meeting_code">

  export type meeting_roomsOrderByWithAggregationInput = {
    id?: SortOrder
    meeting_code?: SortOrder
    title?: SortOrder
    scheduledFor?: SortOrder
    attendees?: SortOrder
    notes?: SortOrderInput | SortOrder
    status?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: meeting_roomsCountOrderByAggregateInput
    _max?: meeting_roomsMaxOrderByAggregateInput
    _min?: meeting_roomsMinOrderByAggregateInput
  }

  export type meeting_roomsScalarWhereWithAggregatesInput = {
    AND?: meeting_roomsScalarWhereWithAggregatesInput | meeting_roomsScalarWhereWithAggregatesInput[]
    OR?: meeting_roomsScalarWhereWithAggregatesInput[]
    NOT?: meeting_roomsScalarWhereWithAggregatesInput | meeting_roomsScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"meeting_rooms"> | string
    meeting_code?: StringWithAggregatesFilter<"meeting_rooms"> | string
    title?: StringWithAggregatesFilter<"meeting_rooms"> | string
    scheduledFor?: DateTimeWithAggregatesFilter<"meeting_rooms"> | Date | string
    attendees?: JsonWithAggregatesFilter<"meeting_rooms">
    notes?: StringNullableWithAggregatesFilter<"meeting_rooms"> | string | null
    status?: StringWithAggregatesFilter<"meeting_rooms"> | string
    is_active?: BoolWithAggregatesFilter<"meeting_rooms"> | boolean
    created_at?: DateTimeWithAggregatesFilter<"meeting_rooms"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"meeting_rooms"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    clerkId: string
    name?: string | null
    email?: string | null
    imageUrl?: string | null
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateInput = {
    id?: string
    clerkId: string
    name?: string | null
    email?: string | null
    imageUrl?: string | null
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateManyInput = {
    id?: string
    clerkId: string
    name?: string | null
    email?: string | null
    imageUrl?: string | null
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingCreateInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    MeetingNote?: MeetingNoteCreateNestedManyWithoutMeetingInput
    recordings?: RecordingCreateNestedManyWithoutMeetingInput
  }

  export type MeetingUncheckedCreateInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    MeetingNote?: MeetingNoteUncheckedCreateNestedManyWithoutMeetingInput
    recordings?: RecordingUncheckedCreateNestedManyWithoutMeetingInput
  }

  export type MeetingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    MeetingNote?: MeetingNoteUpdateManyWithoutMeetingNestedInput
    recordings?: RecordingUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    MeetingNote?: MeetingNoteUncheckedUpdateManyWithoutMeetingNestedInput
    recordings?: RecordingUncheckedUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingCreateManyInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MeetingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingCreateInput = {
    id?: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
    meeting: MeetingCreateNestedOneWithoutRecordingsInput
  }

  export type RecordingUncheckedCreateInput = {
    id?: string
    meetingId: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
  }

  export type RecordingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    meeting?: MeetingUpdateOneRequiredWithoutRecordingsNestedInput
  }

  export type RecordingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    meetingId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingCreateManyInput = {
    id?: string
    meetingId: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
  }

  export type RecordingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    meetingId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingNoteCreateInput = {
    id?: string
    content: string
    createdAt?: Date | string
    Meeting: MeetingCreateNestedOneWithoutMeetingNoteInput
  }

  export type MeetingNoteUncheckedCreateInput = {
    id?: string
    meetingId: string
    content: string
    createdAt?: Date | string
  }

  export type MeetingNoteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Meeting?: MeetingUpdateOneRequiredWithoutMeetingNoteNestedInput
  }

  export type MeetingNoteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    meetingId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingNoteCreateManyInput = {
    id?: string
    meetingId: string
    content: string
    createdAt?: Date | string
  }

  export type MeetingNoteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingNoteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    meetingId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type meeting_roomsCreateInput = {
    id: string
    meeting_code: string
    title: string
    scheduledFor: Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: string | null
    status?: string
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type meeting_roomsUncheckedCreateInput = {
    id: string
    meeting_code: string
    title: string
    scheduledFor: Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: string | null
    status?: string
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type meeting_roomsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    meeting_code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type meeting_roomsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    meeting_code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type meeting_roomsCreateManyInput = {
    id: string
    meeting_code: string
    title: string
    scheduledFor: Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: string | null
    status?: string
    is_active?: boolean
    created_at?: Date | string
    updated_at?: Date | string
  }

  export type meeting_roomsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    meeting_code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type meeting_roomsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    meeting_code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    attendees?: JsonNullValueInput | InputJsonValue
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    is_active?: BoolFieldUpdateOperationsInput | boolean
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    clerkId?: SortOrder
    name?: SortOrder
    email?: SortOrder
    imageUrl?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    clerkId?: SortOrder
    name?: SortOrder
    email?: SortOrder
    imageUrl?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    clerkId?: SortOrder
    name?: SortOrder
    email?: SortOrder
    imageUrl?: SortOrder
    role?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type MeetingNoteListRelationFilter = {
    every?: MeetingNoteWhereInput
    some?: MeetingNoteWhereInput
    none?: MeetingNoteWhereInput
  }

  export type RecordingListRelationFilter = {
    every?: RecordingWhereInput
    some?: RecordingWhereInput
    none?: RecordingWhereInput
  }

  export type MeetingNoteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RecordingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MeetingCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    title?: SortOrder
    date?: SortOrder
    scheduledFor?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    durationMins?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MeetingAvgOrderByAggregateInput = {
    durationMins?: SortOrder
  }

  export type MeetingMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    title?: SortOrder
    date?: SortOrder
    scheduledFor?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    durationMins?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MeetingMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    title?: SortOrder
    date?: SortOrder
    scheduledFor?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    durationMins?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MeetingSumOrderByAggregateInput = {
    durationMins?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type MeetingScalarRelationFilter = {
    is?: MeetingWhereInput
    isNot?: MeetingWhereInput
  }

  export type RecordingCountOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    title?: SortOrder
    s3Url?: SortOrder
    duration?: SortOrder
    createdAt?: SortOrder
  }

  export type RecordingAvgOrderByAggregateInput = {
    duration?: SortOrder
  }

  export type RecordingMaxOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    title?: SortOrder
    s3Url?: SortOrder
    duration?: SortOrder
    createdAt?: SortOrder
  }

  export type RecordingMinOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    title?: SortOrder
    s3Url?: SortOrder
    duration?: SortOrder
    createdAt?: SortOrder
  }

  export type RecordingSumOrderByAggregateInput = {
    duration?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type MeetingNoteCountOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type MeetingNoteMaxOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type MeetingNoteMinOrderByAggregateInput = {
    id?: SortOrder
    meetingId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type meeting_roomsCountOrderByAggregateInput = {
    id?: SortOrder
    meeting_code?: SortOrder
    title?: SortOrder
    scheduledFor?: SortOrder
    attendees?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type meeting_roomsMaxOrderByAggregateInput = {
    id?: SortOrder
    meeting_code?: SortOrder
    title?: SortOrder
    scheduledFor?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type meeting_roomsMinOrderByAggregateInput = {
    id?: SortOrder
    meeting_code?: SortOrder
    title?: SortOrder
    scheduledFor?: SortOrder
    notes?: SortOrder
    status?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type MeetingNoteCreateNestedManyWithoutMeetingInput = {
    create?: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput> | MeetingNoteCreateWithoutMeetingInput[] | MeetingNoteUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: MeetingNoteCreateOrConnectWithoutMeetingInput | MeetingNoteCreateOrConnectWithoutMeetingInput[]
    createMany?: MeetingNoteCreateManyMeetingInputEnvelope
    connect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
  }

  export type RecordingCreateNestedManyWithoutMeetingInput = {
    create?: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput> | RecordingCreateWithoutMeetingInput[] | RecordingUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: RecordingCreateOrConnectWithoutMeetingInput | RecordingCreateOrConnectWithoutMeetingInput[]
    createMany?: RecordingCreateManyMeetingInputEnvelope
    connect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
  }

  export type MeetingNoteUncheckedCreateNestedManyWithoutMeetingInput = {
    create?: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput> | MeetingNoteCreateWithoutMeetingInput[] | MeetingNoteUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: MeetingNoteCreateOrConnectWithoutMeetingInput | MeetingNoteCreateOrConnectWithoutMeetingInput[]
    createMany?: MeetingNoteCreateManyMeetingInputEnvelope
    connect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
  }

  export type RecordingUncheckedCreateNestedManyWithoutMeetingInput = {
    create?: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput> | RecordingCreateWithoutMeetingInput[] | RecordingUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: RecordingCreateOrConnectWithoutMeetingInput | RecordingCreateOrConnectWithoutMeetingInput[]
    createMany?: RecordingCreateManyMeetingInputEnvelope
    connect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type MeetingNoteUpdateManyWithoutMeetingNestedInput = {
    create?: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput> | MeetingNoteCreateWithoutMeetingInput[] | MeetingNoteUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: MeetingNoteCreateOrConnectWithoutMeetingInput | MeetingNoteCreateOrConnectWithoutMeetingInput[]
    upsert?: MeetingNoteUpsertWithWhereUniqueWithoutMeetingInput | MeetingNoteUpsertWithWhereUniqueWithoutMeetingInput[]
    createMany?: MeetingNoteCreateManyMeetingInputEnvelope
    set?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    disconnect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    delete?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    connect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    update?: MeetingNoteUpdateWithWhereUniqueWithoutMeetingInput | MeetingNoteUpdateWithWhereUniqueWithoutMeetingInput[]
    updateMany?: MeetingNoteUpdateManyWithWhereWithoutMeetingInput | MeetingNoteUpdateManyWithWhereWithoutMeetingInput[]
    deleteMany?: MeetingNoteScalarWhereInput | MeetingNoteScalarWhereInput[]
  }

  export type RecordingUpdateManyWithoutMeetingNestedInput = {
    create?: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput> | RecordingCreateWithoutMeetingInput[] | RecordingUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: RecordingCreateOrConnectWithoutMeetingInput | RecordingCreateOrConnectWithoutMeetingInput[]
    upsert?: RecordingUpsertWithWhereUniqueWithoutMeetingInput | RecordingUpsertWithWhereUniqueWithoutMeetingInput[]
    createMany?: RecordingCreateManyMeetingInputEnvelope
    set?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    disconnect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    delete?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    connect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    update?: RecordingUpdateWithWhereUniqueWithoutMeetingInput | RecordingUpdateWithWhereUniqueWithoutMeetingInput[]
    updateMany?: RecordingUpdateManyWithWhereWithoutMeetingInput | RecordingUpdateManyWithWhereWithoutMeetingInput[]
    deleteMany?: RecordingScalarWhereInput | RecordingScalarWhereInput[]
  }

  export type MeetingNoteUncheckedUpdateManyWithoutMeetingNestedInput = {
    create?: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput> | MeetingNoteCreateWithoutMeetingInput[] | MeetingNoteUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: MeetingNoteCreateOrConnectWithoutMeetingInput | MeetingNoteCreateOrConnectWithoutMeetingInput[]
    upsert?: MeetingNoteUpsertWithWhereUniqueWithoutMeetingInput | MeetingNoteUpsertWithWhereUniqueWithoutMeetingInput[]
    createMany?: MeetingNoteCreateManyMeetingInputEnvelope
    set?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    disconnect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    delete?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    connect?: MeetingNoteWhereUniqueInput | MeetingNoteWhereUniqueInput[]
    update?: MeetingNoteUpdateWithWhereUniqueWithoutMeetingInput | MeetingNoteUpdateWithWhereUniqueWithoutMeetingInput[]
    updateMany?: MeetingNoteUpdateManyWithWhereWithoutMeetingInput | MeetingNoteUpdateManyWithWhereWithoutMeetingInput[]
    deleteMany?: MeetingNoteScalarWhereInput | MeetingNoteScalarWhereInput[]
  }

  export type RecordingUncheckedUpdateManyWithoutMeetingNestedInput = {
    create?: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput> | RecordingCreateWithoutMeetingInput[] | RecordingUncheckedCreateWithoutMeetingInput[]
    connectOrCreate?: RecordingCreateOrConnectWithoutMeetingInput | RecordingCreateOrConnectWithoutMeetingInput[]
    upsert?: RecordingUpsertWithWhereUniqueWithoutMeetingInput | RecordingUpsertWithWhereUniqueWithoutMeetingInput[]
    createMany?: RecordingCreateManyMeetingInputEnvelope
    set?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    disconnect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    delete?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    connect?: RecordingWhereUniqueInput | RecordingWhereUniqueInput[]
    update?: RecordingUpdateWithWhereUniqueWithoutMeetingInput | RecordingUpdateWithWhereUniqueWithoutMeetingInput[]
    updateMany?: RecordingUpdateManyWithWhereWithoutMeetingInput | RecordingUpdateManyWithWhereWithoutMeetingInput[]
    deleteMany?: RecordingScalarWhereInput | RecordingScalarWhereInput[]
  }

  export type MeetingCreateNestedOneWithoutRecordingsInput = {
    create?: XOR<MeetingCreateWithoutRecordingsInput, MeetingUncheckedCreateWithoutRecordingsInput>
    connectOrCreate?: MeetingCreateOrConnectWithoutRecordingsInput
    connect?: MeetingWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type MeetingUpdateOneRequiredWithoutRecordingsNestedInput = {
    create?: XOR<MeetingCreateWithoutRecordingsInput, MeetingUncheckedCreateWithoutRecordingsInput>
    connectOrCreate?: MeetingCreateOrConnectWithoutRecordingsInput
    upsert?: MeetingUpsertWithoutRecordingsInput
    connect?: MeetingWhereUniqueInput
    update?: XOR<XOR<MeetingUpdateToOneWithWhereWithoutRecordingsInput, MeetingUpdateWithoutRecordingsInput>, MeetingUncheckedUpdateWithoutRecordingsInput>
  }

  export type MeetingCreateNestedOneWithoutMeetingNoteInput = {
    create?: XOR<MeetingCreateWithoutMeetingNoteInput, MeetingUncheckedCreateWithoutMeetingNoteInput>
    connectOrCreate?: MeetingCreateOrConnectWithoutMeetingNoteInput
    connect?: MeetingWhereUniqueInput
  }

  export type MeetingUpdateOneRequiredWithoutMeetingNoteNestedInput = {
    create?: XOR<MeetingCreateWithoutMeetingNoteInput, MeetingUncheckedCreateWithoutMeetingNoteInput>
    connectOrCreate?: MeetingCreateOrConnectWithoutMeetingNoteInput
    upsert?: MeetingUpsertWithoutMeetingNoteInput
    connect?: MeetingWhereUniqueInput
    update?: XOR<XOR<MeetingUpdateToOneWithWhereWithoutMeetingNoteInput, MeetingUpdateWithoutMeetingNoteInput>, MeetingUncheckedUpdateWithoutMeetingNoteInput>
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type MeetingNoteCreateWithoutMeetingInput = {
    id?: string
    content: string
    createdAt?: Date | string
  }

  export type MeetingNoteUncheckedCreateWithoutMeetingInput = {
    id?: string
    content: string
    createdAt?: Date | string
  }

  export type MeetingNoteCreateOrConnectWithoutMeetingInput = {
    where: MeetingNoteWhereUniqueInput
    create: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput>
  }

  export type MeetingNoteCreateManyMeetingInputEnvelope = {
    data: MeetingNoteCreateManyMeetingInput | MeetingNoteCreateManyMeetingInput[]
    skipDuplicates?: boolean
  }

  export type RecordingCreateWithoutMeetingInput = {
    id?: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
  }

  export type RecordingUncheckedCreateWithoutMeetingInput = {
    id?: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
  }

  export type RecordingCreateOrConnectWithoutMeetingInput = {
    where: RecordingWhereUniqueInput
    create: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput>
  }

  export type RecordingCreateManyMeetingInputEnvelope = {
    data: RecordingCreateManyMeetingInput | RecordingCreateManyMeetingInput[]
    skipDuplicates?: boolean
  }

  export type MeetingNoteUpsertWithWhereUniqueWithoutMeetingInput = {
    where: MeetingNoteWhereUniqueInput
    update: XOR<MeetingNoteUpdateWithoutMeetingInput, MeetingNoteUncheckedUpdateWithoutMeetingInput>
    create: XOR<MeetingNoteCreateWithoutMeetingInput, MeetingNoteUncheckedCreateWithoutMeetingInput>
  }

  export type MeetingNoteUpdateWithWhereUniqueWithoutMeetingInput = {
    where: MeetingNoteWhereUniqueInput
    data: XOR<MeetingNoteUpdateWithoutMeetingInput, MeetingNoteUncheckedUpdateWithoutMeetingInput>
  }

  export type MeetingNoteUpdateManyWithWhereWithoutMeetingInput = {
    where: MeetingNoteScalarWhereInput
    data: XOR<MeetingNoteUpdateManyMutationInput, MeetingNoteUncheckedUpdateManyWithoutMeetingInput>
  }

  export type MeetingNoteScalarWhereInput = {
    AND?: MeetingNoteScalarWhereInput | MeetingNoteScalarWhereInput[]
    OR?: MeetingNoteScalarWhereInput[]
    NOT?: MeetingNoteScalarWhereInput | MeetingNoteScalarWhereInput[]
    id?: StringFilter<"MeetingNote"> | string
    meetingId?: StringFilter<"MeetingNote"> | string
    content?: StringFilter<"MeetingNote"> | string
    createdAt?: DateTimeFilter<"MeetingNote"> | Date | string
  }

  export type RecordingUpsertWithWhereUniqueWithoutMeetingInput = {
    where: RecordingWhereUniqueInput
    update: XOR<RecordingUpdateWithoutMeetingInput, RecordingUncheckedUpdateWithoutMeetingInput>
    create: XOR<RecordingCreateWithoutMeetingInput, RecordingUncheckedCreateWithoutMeetingInput>
  }

  export type RecordingUpdateWithWhereUniqueWithoutMeetingInput = {
    where: RecordingWhereUniqueInput
    data: XOR<RecordingUpdateWithoutMeetingInput, RecordingUncheckedUpdateWithoutMeetingInput>
  }

  export type RecordingUpdateManyWithWhereWithoutMeetingInput = {
    where: RecordingScalarWhereInput
    data: XOR<RecordingUpdateManyMutationInput, RecordingUncheckedUpdateManyWithoutMeetingInput>
  }

  export type RecordingScalarWhereInput = {
    AND?: RecordingScalarWhereInput | RecordingScalarWhereInput[]
    OR?: RecordingScalarWhereInput[]
    NOT?: RecordingScalarWhereInput | RecordingScalarWhereInput[]
    id?: StringFilter<"Recording"> | string
    meetingId?: StringFilter<"Recording"> | string
    title?: StringFilter<"Recording"> | string
    s3Url?: StringFilter<"Recording"> | string
    duration?: IntNullableFilter<"Recording"> | number | null
    createdAt?: DateTimeFilter<"Recording"> | Date | string
  }

  export type MeetingCreateWithoutRecordingsInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    MeetingNote?: MeetingNoteCreateNestedManyWithoutMeetingInput
  }

  export type MeetingUncheckedCreateWithoutRecordingsInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    MeetingNote?: MeetingNoteUncheckedCreateNestedManyWithoutMeetingInput
  }

  export type MeetingCreateOrConnectWithoutRecordingsInput = {
    where: MeetingWhereUniqueInput
    create: XOR<MeetingCreateWithoutRecordingsInput, MeetingUncheckedCreateWithoutRecordingsInput>
  }

  export type MeetingUpsertWithoutRecordingsInput = {
    update: XOR<MeetingUpdateWithoutRecordingsInput, MeetingUncheckedUpdateWithoutRecordingsInput>
    create: XOR<MeetingCreateWithoutRecordingsInput, MeetingUncheckedCreateWithoutRecordingsInput>
    where?: MeetingWhereInput
  }

  export type MeetingUpdateToOneWithWhereWithoutRecordingsInput = {
    where?: MeetingWhereInput
    data: XOR<MeetingUpdateWithoutRecordingsInput, MeetingUncheckedUpdateWithoutRecordingsInput>
  }

  export type MeetingUpdateWithoutRecordingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    MeetingNote?: MeetingNoteUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingUncheckedUpdateWithoutRecordingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    MeetingNote?: MeetingNoteUncheckedUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingCreateWithoutMeetingNoteInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    recordings?: RecordingCreateNestedManyWithoutMeetingInput
  }

  export type MeetingUncheckedCreateWithoutMeetingNoteInput = {
    id?: string
    code: string
    title: string
    date: Date | string
    scheduledFor: Date | string
    startTime: Date | string
    endTime: Date | string
    durationMins: number
    createdAt?: Date | string
    updatedAt?: Date | string
    recordings?: RecordingUncheckedCreateNestedManyWithoutMeetingInput
  }

  export type MeetingCreateOrConnectWithoutMeetingNoteInput = {
    where: MeetingWhereUniqueInput
    create: XOR<MeetingCreateWithoutMeetingNoteInput, MeetingUncheckedCreateWithoutMeetingNoteInput>
  }

  export type MeetingUpsertWithoutMeetingNoteInput = {
    update: XOR<MeetingUpdateWithoutMeetingNoteInput, MeetingUncheckedUpdateWithoutMeetingNoteInput>
    create: XOR<MeetingCreateWithoutMeetingNoteInput, MeetingUncheckedCreateWithoutMeetingNoteInput>
    where?: MeetingWhereInput
  }

  export type MeetingUpdateToOneWithWhereWithoutMeetingNoteInput = {
    where?: MeetingWhereInput
    data: XOR<MeetingUpdateWithoutMeetingNoteInput, MeetingUncheckedUpdateWithoutMeetingNoteInput>
  }

  export type MeetingUpdateWithoutMeetingNoteInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    recordings?: RecordingUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingUncheckedUpdateWithoutMeetingNoteInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledFor?: DateTimeFieldUpdateOperationsInput | Date | string
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    durationMins?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    recordings?: RecordingUncheckedUpdateManyWithoutMeetingNestedInput
  }

  export type MeetingNoteCreateManyMeetingInput = {
    id?: string
    content: string
    createdAt?: Date | string
  }

  export type RecordingCreateManyMeetingInput = {
    id?: string
    title: string
    s3Url: string
    duration?: number | null
    createdAt?: Date | string
  }

  export type MeetingNoteUpdateWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingNoteUncheckedUpdateWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MeetingNoteUncheckedUpdateManyWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingUpdateWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingUncheckedUpdateWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RecordingUncheckedUpdateManyWithoutMeetingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    s3Url?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}