export function collectMarketIndexes(state = {}) {
  const market = state?.hustleMarket || {};
  const offers = Array.isArray(market.offers) ? market.offers : [];
  const accepted = Array.isArray(market.accepted) ? market.accepted : [];

  const offersById = new Map();
  offers.forEach(offer => {
    if (offer?.id) {
      offersById.set(offer.id, offer);
    }
  });

  const acceptedByInstance = new Map();
  const acceptedByOffer = new Map();
  accepted.forEach(entry => {
    if (entry?.instanceId) {
      acceptedByInstance.set(entry.instanceId, entry);
    }
    if (entry?.offerId) {
      acceptedByOffer.set(entry.offerId, entry);
    }
  });

  return { offersById, acceptedByInstance, acceptedByOffer };
}

export default collectMarketIndexes;
