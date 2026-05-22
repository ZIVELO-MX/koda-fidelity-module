export const mockData = {
  businesses: [
    {
      id: "biz-coffee",
      name: "The Daily Grind",
      brandColor: "#f97316",
      email: "owner@dailygrind.com",
      loyaltyCards: {
        create: [
          {
            id: "card-coffee",
            name: "Coffee Rewards",
            reward: "Free Coffee",
            stampsRequired: 10,
            brandColor: "#f97316",
            description: "Buy 9 coffees, get 1 free",
          },
        ],
      },
    },
    {
      id: "biz-bistro",
      name: "Bistro 42",
      brandColor: "#3b82f6",
      email: "hello@bistro42.com",
      loyaltyCards: {
        create: [
          {
            id: "card-lunch",
            name: "Lunch Special",
            reward: "Free Dessert",
            stampsRequired: 8,
            brandColor: "#3b82f6",
            description: "Collect stamps with every lunch",
          },
        ],
      },
    },
  ],
  customers: [
    {
      id: "cust-sarah",
      name: "Sarah Mitchell",
      cardId: "card-coffee",
      stamps: 7,
      stampsLog: {
        create: Array.from({ length: 7 }, () => ({ type: "stamp" as const })),
      },
    },
    {
      id: "cust-john",
      name: "John Davidson",
      cardId: "card-coffee",
      stamps: 10,
      stampsLog: {
        create: [
          ...Array.from({ length: 10 }, () => ({ type: "stamp" as const })),
          ...Array.from({ length: 3 }, () => ({ type: "redeem" as const })),
        ],
      },
    },
    {
      id: "cust-emma",
      name: "Emma Wilson",
      cardId: "card-lunch",
      stamps: 3,
      stampsLog: {
        create: Array.from({ length: 3 }, () => ({ type: "stamp" as const })),
      },
    },
    {
      id: "cust-mike",
      name: "Mike Roberts",
      cardId: "card-coffee",
      stamps: 5,
      stampsLog: {
        create: [
          ...Array.from({ length: 5 }, () => ({ type: "stamp" as const })),
          { type: "redeem" as const },
        ],
      },
    },
    {
      id: "cust-lisa",
      name: "Lisa Chen",
      cardId: "card-lunch",
      stamps: 6,
      stampsLog: {
        create: [
          ...Array.from({ length: 6 }, () => ({ type: "stamp" as const })),
          { type: "redeem" as const },
        ],
      },
    },
  ],
}
