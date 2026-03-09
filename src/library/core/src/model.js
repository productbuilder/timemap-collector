function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeCollection(collection) {
  if (!collection || typeof collection !== 'object') {
    throw new Error('Collection payload must be an object.');
  }

  const items = asArray(collection.items).map((item, index) => {
    const media = item && typeof item.media === 'object' ? item.media : {};
    return {
      id: item?.id || `item_${index + 1}`,
      title: item?.title || `Item ${index + 1}`,
      description: item?.description || '',
      creator: item?.creator || '',
      date: item?.date || '',
      location: item?.location || '',
      license: item?.license || '',
      attribution: item?.attribution || '',
      source: item?.source || '',
      tags: Array.isArray(item?.tags) ? item.tags : [],
      include: item?.include !== false,
      media: {
        type: media.type || 'image',
        url: media.url || '',
        thumbnailUrl: media.thumbnailUrl || media.url || '',
      },
    };
  });

  return {
    id: collection.id || 'collection',
    title: collection.title || 'Collection',
    description: collection.description || '',
    items,
  };
}
