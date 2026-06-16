type OwnershipStore = Map<string, string>;

function getStore(): OwnershipStore {
  const globalObj = globalThis as typeof globalThis & {
    __aiconnectRecordingOwnership?: OwnershipStore;
  };
  if (!globalObj.__aiconnectRecordingOwnership) {
    globalObj.__aiconnectRecordingOwnership = new Map<string, string>();
  }
  return globalObj.__aiconnectRecordingOwnership;
}

export function setRecordingOwner(egressId: string, userId: string) {
  getStore().set(egressId, userId);
}

export function getRecordingOwner(egressId: string) {
  return getStore().get(egressId);
}

export function clearRecordingOwner(egressId: string) {
  getStore().delete(egressId);
}
