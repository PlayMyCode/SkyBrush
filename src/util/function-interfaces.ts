
export type Nullable<T> =
  | T
  | null

export type Consumer0 =
  () => void

export type Consumer<V> =
  ( v:V ) => void

export type Consumer2<V1, V2> =
  ( v1:V1, v2:V2 ) => void

export type Consumer3<V1, V2, V3> =
  ( v1:V1, v2:V2, v3:V3 ) => void

export type Consumer4<V1, V2, V3, V4> =
  ( v1:V1, v2:V2, v3:V3, v4:V4 ) => void

export type MapFunction<V1, R> =
  ( v1:V1 ) => R

export type MapFunction2<V1, V2, R> =
  ( v1:V1, v2:V2 ) => R

export type MapFunction3<V1, V2, V3, R> =
  ( v1:V1, v2:V2, v3:V3 ) => R

export type MapFunction4<V1, V2, V3, V4, R> =
  ( v1:V1, v2:V2, v3:V3, v4:V4 ) => R

export type Callback0 =
  Consumer< Consumer0 >

export type Callback<V> =
  Consumer< Consumer<V> >

export type Callback2<V1, V2> =
  Consumer< Consumer2<V1, V2> >

export type Callback3<V1, V2, V3> =
  Consumer< Consumer3<V1, V2, V3> >

export type Callback4<V1, V2, V3, V4> =
  Consumer< Consumer4<V1, V2, V3, V4> >
