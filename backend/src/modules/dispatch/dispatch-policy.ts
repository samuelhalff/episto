import { validationError } from "../../shared/errors/index.js";

interface DispatchPolicyConstraints {
  recipientCountry?: string | null | undefined;
  estimatedPages: number;
}

export function assertDispatchPolicyConstraints(
  constraints: DispatchPolicyConstraints,
): void {
  const recipientCountry = constraints.recipientCountry?.trim().toUpperCase() ?? null;

  if (recipientCountry && recipientCountry !== "CH") {
    throw validationError("Swiss Mail can only send letters to Swiss recipient addresses.", [
      {
        field: "recipient",
        message: "Recipient address must be in Switzerland.",
      },
    ]);
  }

  if (constraints.estimatedPages > 5) {
    throw validationError("Letters are limited to 5 pages.", [
      {
        field: "estimatedPages",
        message: "Shorten the letter to 5 pages or fewer before continuing.",
      },
    ]);
  }
}
