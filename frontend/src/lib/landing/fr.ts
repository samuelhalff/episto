import type { LandingPage } from "./types";

export const FR_LANDING_PAGES: LandingPage[] = [
  {
    slug: "wohnung-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier son appartement en Suisse – lettre & envoi",
    metaDescription:
      "Résiliez votre bail en Suisse dans les règles : vérifiez délai, terme et forme. episto rédige votre résiliation et l’envoie – en recommandé sur demande.",
    h1: "Résilier son appartement : mettre fin au bail correctement et dans les délais",
    quickAnswer:
      "Pour résilier votre appartement en Suisse, adressez au bailleur une résiliation écrite qui parvient au plus tard le dernier jour avant le début du délai. Pour les baux de durée indéterminée, un délai de trois mois pour le terme usuel s’applique en règle générale. Un envoi recommandé fait office de preuve.",
    steps: [
      {
        title: "Vérifier le délai et le terme",
        text: "Consultez votre bail pour connaître le délai de résiliation et les termes autorisés. En l’absence d’indication, le minimum légal de trois mois pour un terme usuel s’applique.",
      },
      {
        title: "Rassembler les informations",
        text: "Notez l’adresse du logement, la date de fin souhaitée ainsi que les noms de toutes les personnes ayant signé le bail.",
      },
      {
        title: "Rédiger la résiliation",
        text: "Formulez un courrier clair avec l’objet, la date de résiliation et la signature. episto en fait une lettre soignée en quelques minutes.",
      },
      {
        title: "Envoyer de manière traçable",
        text: "Expédiez la résiliation en recommandé afin de pouvoir prouver sa réception dans les délais. episto imprime et envoie la lettre pour vous.",
      },
    ],
    checklist: [
      "Adresse complète du bailleur et du logement concerné",
      "Date de résiliation précise (date de fin du bail)",
      "Référence au contrat de bail",
      "Signature de toutes les parties contractantes",
      "Demande de confirmation écrite",
    ],
    notes: [
      {
        title: "Logement familial : signature des deux partenaires",
        body: "Pour un logement familial occupé en commun, les deux conjoints ou partenaires enregistrés doivent signer la résiliation – même si une seule personne figure au bail.",
      },
      {
        title: "C’est la réception dans les délais qui compte",
        body: "Ce n’est pas la date de la lettre qui fait foi, mais celle à laquelle la résiliation parvient au bailleur. Tenez compte du délai postal et envoyez suffisamment tôt.",
      },
    ],
    faqs: [
      {
        question: "Quel est le délai de résiliation pour un appartement ?",
        answer:
          "Pour les baux de durée indéterminée, le délai légal minimal est de trois mois pour le terme usuel. Le bail peut prévoir des délais plus longs – les indications du contrat priment.",
      },
      {
        question: "Dois-je envoyer la résiliation en recommandé ?",
        answer:
          "La loi ne prescrit aucun mode d’envoi particulier. Un envoi recommandé est toutefois vivement conseillé, car il vous permet de prouver la réception dans les délais.",
      },
      {
        question: "Puis-je résilier le bail de manière anticipée ?",
        answer:
          "Oui. Vous pouvez résilier hors terme si vous proposez un locataire de remplacement solvable et disposé à reprendre le bail aux conditions existantes.",
      },
      {
        question: "Combien coûte l’envoi avec episto ?",
        answer:
          "Vous voyez le prix exact avant de payer. Il se compose de l’affranchissement et d’un forfait de service transparent ; un envoi recommandé coûte un peu plus qu’une lettre standard.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "mietzins-senken"],
  },
  {
    slug: "einschreiben-online",
    category: "Envoi",
    metaTitle: "Envoyer un recommandé en ligne – sans guichet",
    metaDescription:
      "Rédiger et envoyer un recommandé en ligne, sans passer par le guichet postal. episto imprime votre lettre et la remet à La Poste Suisse – avec preuve de dépôt.",
    h1: "Envoyer un recommandé en ligne – sans passer par le bureau de poste",
    quickAnswer:
      "Envoyer un recommandé en ligne signifie que vous rédigez la lettre de manière numérique et qu’un service l’imprime et la remet à La Poste comme envoi recommandé. Vous obtenez ainsi une preuve de distribution sans vous rendre au guichet. Avec episto, c’est fait en quelques minutes.",
    steps: [
      {
        title: "Créer la lettre en ligne",
        text: "Décrivez votre demande. episto en fait un courrier formel et soigné que vous pouvez vérifier et adapter.",
      },
      {
        title: "Choisir l’envoi recommandé",
        text: "Sélectionnez l’option « Recommandé » lors de l’envoi. Vous voyez le total exact avant de payer.",
      },
      {
        title: "Impression et remise",
        text: "episto imprime la lettre, la met sous enveloppe et la remet à La Poste Suisse comme envoi recommandé.",
      },
      {
        title: "Suivre la distribution",
        text: "Un recommandé inclut une preuve de dépôt et de distribution, ce qui vous permet de documenter l’envoi.",
      },
    ],
    checklist: [
      "Adresse complète du destinataire en Suisse",
      "Objet et demande clairs",
      "Date et signature",
      "Éventuelles annexes au format PDF",
      "Choix du mode « Recommandé » lors de l’envoi",
    ],
    notes: [
      {
        title: "Quand un recommandé est-il utile",
        body: "Un recommandé est conseillé chaque fois qu’un délai court ou que la réception est importante – par exemple pour les résiliations, les oppositions ou les rappels de paiement.",
      },
      {
        title: "Adresses en Suisse uniquement",
        body: "episto envoie des lettres à des adresses de destinataires en Suisse. Vous vérifiez l’adresse avant l’envoi.",
      },
    ],
    faqs: [
      {
        question: "Puis-je envoyer un recommandé sans aller à la poste ?",
        answer:
          "Oui. Vous rédigez la lettre en ligne et episto l’imprime et la remet à La Poste Suisse comme envoi recommandé. Aucun passage au guichet n’est nécessaire.",
      },
      {
        question: "Est-ce que je reçois une preuve de distribution ?",
        answer:
          "Oui. Un recommandé comprend une preuve de dépôt et de distribution que vous pouvez conserver par sécurité.",
      },
      {
        question: "Ai-je besoin d’un compte ?",
        answer:
          "Non. Vous pouvez commencer en tant qu’invité, vérifier la lettre et ne payer qu’au moment de l’envoi.",
      },
      {
        question: "Combien coûte un recommandé ?",
        answer:
          "Le prix se compose de l’affranchissement recommandé et d’un forfait de service transparent. Vous voyez le total exact avant de payer.",
      },
    ],
    related: ["wohnung-kuendigen", "brief-online-versenden", "beschwerde-schreiben"],
  },
  {
    slug: "krankenkasse-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier sa caisse-maladie & changer – lettre & délai",
    metaDescription:
      "Résilier l’assurance de base avant le 30 novembre et changer de caisse. episto rédige et envoie votre résiliation – en recommandé si vous le souhaitez.",
    h1: "Résilier et changer de caisse-maladie – dans les délais pour la fin d’année",
    quickAnswer:
      "Pour résilier votre assurance de base, adressez à votre caisse-maladie une résiliation écrite qui lui parvient au plus tard le 30 novembre ; l’assurance prend alors fin le 31 décembre. Inscrivez-vous simultanément auprès d’une nouvelle assurance de base – celle-ci est tenue de vous accepter. Un envoi recommandé assure la preuve.",
    steps: [
      {
        title: "Choisir une nouvelle caisse en même temps",
        text: "Inscrivez-vous auprès d’une nouvelle assurance de base en même temps que vous résiliez l’ancienne. Chaque caisse est tenue de vous accepter. N’attendez pas une confirmation avant de résilier.",
      },
      {
        title: "Rédiger la résiliation",
        text: "Écrivez une résiliation avec le numéro d’assuré, le nom et la date de fin souhaitée (31 décembre). episto rédige la lettre en quelques minutes.",
      },
      {
        title: "Envoyer dans les délais",
        text: "La résiliation doit parvenir à la caisse au plus tard fin novembre. Envoyez suffisamment tôt – idéalement en recommandé.",
      },
      {
        title: "Conserver la confirmation",
        text: "Conservez la confirmation d’envoi et la confirmation de résiliation de la caisse.",
      },
    ],
    checklist: [
      "Numéro d’assuré et date de naissance",
      "Nom complet et adresse",
      "Date de fin souhaitée (31 décembre)",
      "Référence à l’assurance de base",
      "Signature",
    ],
    notes: [
      {
        title: "Délai : 30 novembre",
        body: "La résiliation de l’assurance de base doit parvenir à la caisse-maladie au plus tard le 30 novembre. C’est la réception qui fait foi, pas le cachet postal – envoyez donc à temps, idéalement d’ici mi-novembre.",
      },
      {
        title: "S’inscrire simultanément – ne pas attendre de confirmation",
        body: "Résiliez dans les délais et inscrivez-vous en même temps auprès de la nouvelle caisse. N’attendez pas de confirmation, sinon vous risquez de manquer le délai. L’ancienne assurance prend fin dès que la couverture sans interruption par la nouvelle assurance de base est notifiée.",
      },
    ],
    faqs: [
      {
        question: "Jusqu’à quand dois-je résilier ma caisse-maladie ?",
        answer:
          "La résiliation doit parvenir à la caisse au plus tard le 30 novembre ; l’assurance prend alors fin le 31 décembre. C’est la réception, et non le cachet postal, qui fait foi. Inscrivez-vous simultanément auprès de la nouvelle caisse.",
      },
      {
        question: "Dois-je résilier par envoi recommandé ?",
        answer:
          "Un recommandé n’est pas obligatoire, mais il est conseillé. En raison du délai serré de fin novembre, la preuve de réception est particulièrement importante.",
      },
      {
        question: "Puis-je changer de caisse en cours d’année ?",
        answer:
          "En règle générale, un changement d’assurance de base n’est possible que pour la fin d’année. Dans certaines conditions, par exemple en cas de hausse de prime, des possibilités de résiliation supplémentaires existent.",
      },
      {
        question: "episto rédige-t-il la résiliation pour moi ?",
        answer:
          "Oui. Vous saisissez vos données, episto formule la résiliation et l’envoie – en recommandé avec preuve de distribution si vous le souhaitez.",
      },
    ],
    related: ["versicherung-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "abo-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier un abonnement en Suisse – modèle & envoi",
    metaDescription:
      "Résilier un abonnement de streaming, à un magazine ou à une association : vérifiez délai, durée et preuve. episto rédige et envoie votre résiliation.",
    h1: "Résilier un abonnement : mettre fin au contrat à temps et de manière traçable",
    quickAnswer:
      "Pour résilier un abonnement, vérifiez d’abord la durée, le délai de résiliation et la forme exigée dans le contrat ou les CG. Indiquez votre numéro de client et la date de fin souhaitée et demandez une confirmation. En Suisse, il n’existe pas de droit général de rétractation pour les contrats conclus en ligne. episto formule votre résiliation et l’envoie pour vous.",
    steps: [
      {
        title: "Vérifier le contrat et les CG",
        text: "Recherchez la durée minimale, le délai de résiliation, le terme de résiliation et la forme admise dans votre confirmation ou dans les CG actuelles.",
      },
      {
        title: "Rassembler les données contractuelles",
        text: "Préparez l’adresse du prestataire, le numéro de client ou de membre, le nom du produit et la date de fin souhaitée.",
      },
      {
        title: "Formuler clairement la résiliation",
        text: "Résiliez pour le prochain terme possible et demandez une confirmation écrite. episto en fait une lettre soignée.",
      },
      {
        title: "Envoyer dans les délais",
        text: "Expédiez la résiliation à temps et, pour les abonnements importants ou coûteux, de manière traçable. episto prend en charge l’impression et l’envoi postal.",
      },
    ],
    checklist: [
      "Nom complet et adresse",
      "Prestataire et adresse du destinataire",
      "Numéro de client, de contrat ou de membre",
      "Désignation de l’abonnement et terme de résiliation souhaité",
      "Demande de confirmation écrite de résiliation",
    ],
    notes: [
      {
        title: "Le contrat et les CG sont déterminants",
        body: "Pour les abonnements streaming, magazines et membres, les durées et les voies de résiliation sont souvent différentes. Vérifiez aussi si le contrat se reconduit automatiquement.",
      },
      {
        title: "Pas de droit général de rétractation en ligne",
        body: "Le droit suisse ne connaît pas de droit général de rétractation pour les achats sur internet. Un prestataire peut toutefois accorder volontairement un tel droit dans ses CG.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je résilier mon abonnement ?",
        answer:
          "Vérifiez le délai et la forme dans le contrat, indiquez vos données contractuelles et résiliez clairement pour le prochain terme possible. Faites-vous confirmer la fin du contrat par écrit.",
      },
      {
        question: "Puis-je me rétracter d’un abonnement conclu en ligne ?",
        answer:
          "En Suisse, il n’existe pas de droit général de rétractation pour les contrats conclus en ligne. C’est le prestataire qui décide s’il accorde volontairement un droit de rétractation ou une période d’essai dans ses CG.",
      },
      {
        question: "Que se passe-t-il si je manque le délai de résiliation ?",
        answer:
          "Selon le contrat, l’abonnement se poursuit ou se reconduit. Résiliez tout de même immédiatement pour le prochain terme possible et demandez éventuellement au prestataire une résiliation anticipée à titre commercial.",
      },
      {
        question: "Dois-je résilier un abonnement par recommandé ?",
        answer:
          "Un recommandé n’est souvent pas exigé, mais peut être utile en cas de coûts élevés, de délais serrés ou de confirmation incertaine, car vous pouvez prouver l’envoi.",
      },
    ],
    related: ["handyabo-kuendigen", "fitnessabo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "arbeitsvertrag-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier son contrat de travail – lettre, délai & envoi",
    metaDescription:
      "Résilier correctement son contrat de travail en Suisse : délai, date de fin et notification. episto formule et envoie votre résiliation – en recommandé sur demande.",
    h1: "Résilier son contrat de travail : procéder correctement et professionnellement",
    quickAnswer:
      "Pour résilier votre contrat de travail, vérifiez le contrat et l’éventuelle convention collective de travail quant au délai et au terme de résiliation. La résiliation doit parvenir à l’employeur dans les délais ; la forme écrite est généralement conseillée pour des raisons de preuve. Indiquez la date de fin et demandez une confirmation ainsi qu’un certificat de travail. episto formule et envoie votre résiliation.",
    steps: [
      {
        title: "Vérifier les règles de résiliation",
        text: "Lisez le contrat de travail, le règlement du personnel et l’éventuelle convention collective de travail. Le délai de résiliation, le terme autorisé et une éventuelle forme écrite sont déterminants.",
      },
      {
        title: "Déterminer le dernier jour de travail",
        text: "Calculez la fin du contrat en tenant compte du moment où la résiliation doit parvenir à l’employeur. Clarifiez les vacances et les heures supplémentaires séparément.",
      },
      {
        title: "Rédiger la résiliation",
        text: "Formulez de manière brève, claire et professionnelle. Une motivation n’est en général pas nécessaire pour une démission ordinaire.",
      },
      {
        title: "Documenter la réception",
        text: "Remettez la lettre contre accusé de réception ou envoyez-la de manière traçable. Sur demande, episto prend en charge l’envoi en recommandé.",
      },
    ],
    checklist: [
      "Nom et adresse de l’employé et de l’employeur",
      "Date et phrase de résiliation claire",
      "Fin souhaitée des rapports de travail",
      "Demande de confirmation de résiliation et de certificat de travail",
      "Signature manuscrite lorsque la forme écrite est exigée",
    ],
    notes: [
      {
        title: "C’est la réception dans les délais qui compte",
        body: "La résiliation doit parvenir à l’employeur avant le début du délai de résiliation. La date d’envoi seule ne suffit en principe pas à prouver le respect du délai.",
      },
      {
        title: "Le contrat et la CCT peuvent déroger",
        body: "Les délais de résiliation dépendent notamment de la période d’essai, des années de service et des règles contractuelles. Les contrats de durée déterminée prennent souvent fin sans résiliation ordinaire, sauf convention contraire.",
      },
    ],
    faqs: [
      {
        question: "Comment dois-je résilier mon contrat de travail ?",
        answer:
          "Résiliez clairement et dans les délais pour le terme contractuellement autorisé. Une résiliation écrite et signée avec preuve de distribution est particulièrement utile lorsque le contrat exige la forme écrite.",
      },
      {
        question: "Quel délai de résiliation s’applique à mon emploi ?",
        answer:
          "Consultez d’abord le contrat de travail, le règlement du personnel et la CCT. En l’absence de règle divergente, le délai dépend en principe de la période d’essai et de la durée des rapports de travail.",
      },
      {
        question: "Dois-je motiver ma démission ?",
        answer:
          "En cas de résiliation ordinaire, les travailleurs n’ont normalement pas à indiquer de motif. Un bref remerciement peut préserver un ton professionnel, mais reste facultatif.",
      },
      {
        question: "episto peut-il aussi demander un certificat de travail ?",
        answer:
          "Oui. episto peut intégrer directement dans la résiliation la demande d’un certificat de travail qualifié et d’une confirmation écrite de la date de sortie.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "brief-an-behoerde"],
  },
  {
    slug: "versicherung-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier une assurance – lettre, délai & envoi",
    metaDescription:
      "Résilier correctement une assurance complémentaire, ménage ou RC : police, délai et année d’assurance. episto rédige et envoie la lettre en toute sécurité.",
    h1: "Résilier une assurance : mettre fin à la police dans les délais",
    quickAnswer:
      "Pour résilier une assurance, vérifiez la police et les conditions d’assurance quant à la durée, au délai de résiliation et à la fin de l’année d’assurance. Indiquez le numéro de police et le terme souhaité et faites-vous confirmer la résiliation. En cas de changement, la nouvelle couverture doit être assurée au préalable. episto formule votre résiliation et l’envoie de manière traçable.",
    steps: [
      {
        title: "Lire la police et les conditions",
        text: "Vérifiez la durée du contrat, l’année d’assurance, le délai de résiliation et les éventuels droits de résiliation particuliers dans la police et les conditions générales d’assurance.",
      },
      {
        title: "Coordonner la nouvelle couverture",
        text: "Si la protection reste nécessaire, obtenez d’abord une confirmation d’admission ferme de la nouvelle assurance.",
      },
      {
        title: "Établir la résiliation",
        text: "Indiquez le type d’assurance, le numéro de police et le terme de fin. episto en fait une résiliation claire et formelle.",
      },
      {
        title: "Notifier dans les délais",
        text: "Tenez compte du délai postal et conservez la confirmation d’envoi et de résiliation. Sur demande, episto envoie en recommandé.",
      },
    ],
    checklist: [
      "Nom et adresse de la personne assurée",
      "Compagnie d’assurance et adresse du destinataire",
      "Numéro de police ou de contrat",
      "Type d’assurance et date de fin souhaitée",
      "Demande de confirmation écrite",
    ],
    notes: [
      {
        title: "L’année d’assurance n’est pas toujours l’année civile",
        body: "La fin du contrat peut varier d’une police à l’autre. Vérifiez donc l’année d’assurance concrète et le délai de résiliation plutôt que de partir systématiquement du 31 décembre.",
      },
      {
        title: "Distinguer assurance complémentaire et assurance de base",
        body: "Les assurances complémentaires maladie sont soumises à des règles différentes de celles de l’assurance de base obligatoire. Ne résiliez une assurance complémentaire que lorsqu’une nouvelle couverture souhaitée est confirmée.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je résilier mon assurance ?",
        answer:
          "Vérifiez la police et les conditions d’assurance, indiquez le numéro de police et le terme de fin et envoyez la résiliation suffisamment tôt pour qu’elle parvienne dans le délai convenu.",
      },
      {
        question: "Quand l’année d’assurance se termine-t-elle ?",
        answer:
          "L’année d’assurance ne correspond pas forcément à l’année civile. Vous trouverez la date déterminante dans la police, le dernier avis de prime ou les conditions d’assurance.",
      },
      {
        question: "Puis-je résilier après un sinistre ?",
        answer:
          "Selon le type d’assurance et les conditions, un droit de résiliation particulier peut exister après un sinistre réglé. Vérifiez-le dans la police et réagissez dans le délai qui y est indiqué.",
      },
      {
        question: "Dois-je avoir une nouvelle assurance avant de résilier ?",
        answer:
          "Si vous avez toujours besoin de la protection, c’est vivement recommandé. En particulier pour les assurances complémentaires, une nouvelle admission n’est pas garantie ; évitez donc une lacune de couverture involontaire.",
      },
    ],
    related: ["krankenkasse-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "handyabo-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier son abonnement mobile – modèle, délai & envoi",
    metaDescription:
      "Résilier correctement un abonnement mobile ou internet : durée, délai, numéro et frais d’appareil. episto rédige et envoie la résiliation en toute sécurité.",
    h1: "Résilier son abonnement mobile : maîtriser le délai, le numéro et le changement",
    quickAnswer:
      "Pour résilier un abonnement mobile, vérifiez la durée minimale du contrat, le délai de résiliation et les éventuels frais résiduels pour l’appareil ou les rabais. Indiquez le numéro de client, le numéro d’appel et le terme de fin souhaité. En cas de changement d’opérateur, le portage du numéro doit être coordonné. episto formule votre résiliation et l’envoie pour vous.",
    steps: [
      {
        title: "Vérifier la durée du contrat",
        text: "Contrôlez la durée minimale, le délai de résiliation, la reconduction et les éventuels frais en cas de résiliation anticipée dans le contrat ou l’espace client.",
      },
      {
        title: "Planifier le changement et le numéro",
        text: "Clarifiez avec le nouvel opérateur si et quand votre numéro d’appel est porté. Ne résiliez pas deux fois si le nouvel opérateur prend en charge le changement.",
      },
      {
        title: "Formuler la résiliation",
        text: "Indiquez le numéro de client, de contrat et d’appel ainsi que le terme souhaité. episto rédige une lettre de résiliation sans équivoque.",
      },
      {
        title: "Contrôler la confirmation",
        text: "Vérifiez la date de fin confirmée, les paiements d’appareil en cours et les obligations de restitution. Conservez la confirmation d’envoi et celle de l’opérateur.",
      },
    ],
    checklist: [
      "Nom complet et adresse de facturation",
      "Numéro de client et de contrat",
      "Numéro de mobile ou de ligne fixe concerné",
      "Terme de résiliation souhaité",
      "Mention du portage du numéro et souhait de confirmation",
    ],
    notes: [
      {
        title: "Durée minimale et frais résiduels",
        body: "Une résiliation avant la fin de la durée minimale peut entraîner des frais. Vérifiez aussi les mensualités pour un appareil, les rabais accordés et les éventuelles obligations de restitution.",
      },
      {
        title: "Coordonner le portage avec le nouvel opérateur",
        body: "Si vous souhaitez conserver votre numéro d’appel, clarifiez d’abord le processus de changement avec le nouvel opérateur. Une résiliation non coordonnée peut compliquer le portage.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je résilier mon abonnement mobile ?",
        answer:
          "Vérifiez la durée et le délai de résiliation, indiquez le numéro de client et d’appel et résiliez pour le prochain terme possible. Demandez une confirmation avec la date de fin.",
      },
      {
        question: "Puis-je résilier mon abonnement mobile de manière anticipée ?",
        answer:
          "Cela dépend du contrat. En cas de résiliation anticipée, des frais résiduels, des montants pour l’appareil ou la perte de rabais sont souvent dus ; faites-vous chiffrer les coûts au préalable.",
      },
      {
        question: "Comment conserver mon numéro de mobile ?",
        answer:
          "Chargez le nouvel opérateur du portage et coordonnez la date. Clarifiez s’il prend en charge la résiliation avant d’envoyer vous-même un courrier.",
      },
      {
        question: "Que faire en cas de litige avec l’opérateur ?",
        answer:
          "Adressez d’abord une réclamation écrite à l’opérateur et documentez le contrat, les factures et les réponses. Si le conflit persiste, le service de médiation ombudscom entre souvent en ligne de compte.",
      },
    ],
    related: ["abo-kuendigen", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "fitnessabo-kuendigen",
    category: "Résiliation",
    metaTitle: "Résilier son abonnement fitness – lettre & envoi",
    metaDescription:
      "Résilier son abonnement fitness : durée, reconduction, délai et cas particuliers. episto formule et envoie votre résiliation en toute sécurité par courrier.",
    h1: "Résilier son abonnement fitness : mettre fin à l’adhésion dans les délais",
    quickAnswer:
      "Pour résilier un abonnement fitness, vérifiez le contrat et les CG quant à la durée minimale, la reconduction automatique, le délai de résiliation et la forme exigée. Indiquez le numéro de membre et le terme de fin souhaité. Une maladie ou un déménagement n’entraîne pas automatiquement la résiliation du contrat ; des conditions particulières s’appliquent souvent. episto formule votre résiliation et l’envoie de manière traçable.",
    steps: [
      {
        title: "Vérifier la durée et le délai",
        text: "Lisez le contrat et les CG et notez la durée minimale, la règle de reconduction, le délai de résiliation et la voie de résiliation autorisée.",
      },
      {
        title: "Justifier le cas particulier",
        text: "Si vous résiliez pour cause de maladie, de déménagement ou de modification des prestations, vérifiez la règle contractuelle et joignez le justificatif exigé.",
      },
      {
        title: "Rédiger la lettre de résiliation",
        text: "Indiquez le numéro de membre, le site et le terme de fin souhaité. episto formule le courrier de manière claire et courtoise.",
      },
      {
        title: "Sécuriser la confirmation",
        text: "Envoyez à temps et demandez la fin du contrat par écrit. En cas de délai serré, un envoi traçable est conseillé.",
      },
    ],
    checklist: [
      "Nom, adresse et date de naissance",
      "Numéro de membre ou de contrat",
      "Centre de fitness et site concerné",
      "Terme de résiliation souhaité",
      "Justificatif éventuel pour un motif de résiliation particulier",
    ],
    notes: [
      {
        title: "Attention à la reconduction automatique",
        body: "Selon les CG, les contrats de fitness se reconduisent souvent s’ils ne sont pas résiliés à temps. Ce sont les conditions convenues lors de la conclusion qui font foi.",
      },
      {
        title: "Examiner séparément la maladie ou le déménagement",
        body: "Une fin anticipée n’est pas due dans tous les cas. Certains studios prévoient, sur justificatif, un geste commercial, une suspension ou des règles particulières en cas de maladie durable ou de grande distance.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je résilier mon abonnement fitness ?",
        answer:
          "Vérifiez le contrat et les CG, indiquez le numéro de membre et le terme de fin et envoyez la résiliation dans le délai convenu et sous la forme exigée.",
      },
      {
        question: "Puis-je résilier de manière anticipée pour cause de maladie ?",
        answer:
          "Cela dépend du contrat, de la durée de l’empêchement et des CG. Le centre de fitness exige souvent un certificat médical et propose une résiliation ou une suspension.",
      },
      {
        question: "Puis-je résilier en cas de déménagement ?",
        answer:
          "Un déménagement ne donne pas automatiquement droit à la résiliation. Vérifiez si les CG contiennent une clause de distance et, dans le cas contraire, demandez un geste commercial avec une attestation de domicile.",
      },
      {
        question: "Que faire si le studio ne confirme pas la résiliation ?",
        answer:
          "Relancez par écrit en joignant votre preuve d’envoi. En cas de délai serré ou de réception contestée, un recommandé peut apporter une preuve supplémentaire.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "beschwerde-schreiben"],
  },
  {
    slug: "beschwerde-schreiben",
    category: "Réclamation",
    metaTitle: "Rédiger une réclamation – modèle pour la Suisse",
    metaDescription:
      "Rédiger une réclamation objective, formuler clairement sa demande et joindre les preuves. episto formule et envoie votre lettre de réclamation – en recommandé.",
    h1: "Rédiger une réclamation : objectif, clair et convaincant",
    quickAnswer:
      "Pour rédiger une réclamation, décrivez les faits de manière chronologique, mentionnez le contrat, la commande ou la facture et formulez une solution concrète. Appuyez votre exposé sur des documents pertinents et fixez, si nécessaire, un délai de réponse raisonnable. episto en fait une lettre de réclamation professionnelle et l’envoie pour vous.",
    steps: [
      {
        title: "Ordonner les faits",
        text: "Notez la date, les personnes impliquées, la prestation promise et ce qui s’est réellement passé. Séparez les faits vérifiables de votre appréciation.",
      },
      {
        title: "Définir la solution",
        text: "Décidez de ce que vous attendez concrètement : correction, remplacement, remboursement, explication ou une autre solution appropriée.",
      },
      {
        title: "Rédiger la réclamation",
        text: "Restez courtois et déterminé, mentionnez les preuves et fixez, si nécessaire, un délai de réponse réaliste. episto structure la lettre.",
      },
      {
        title: "Documenter l’envoi",
        text: "Ne joignez que les copies nécessaires et conservez le courrier et la preuve d’envoi. Pour les demandes importantes, un recommandé est utile.",
      },
    ],
    checklist: [
      "Adresse complète de l’expéditeur et du destinataire",
      "Objet clair avec numéro de client, de commande ou de facture",
      "Exposé chronologique et objectif",
      "Solution concrète souhaitée et délai de réponse",
      "Preuves pertinentes en copie ou au format PDF",
    ],
    notes: [
      {
        title: "Des faits, pas des reproches",
        body: "Une chronologie précise, des données concrètes et des preuves compréhensibles sont souvent plus efficaces que des reproches généraux ou des formulations émotionnelles.",
      },
      {
        title: "Examiner la voie d’escalade",
        body: "De nombreuses branches connaissent des services de médiation ou de conciliation. Il faut souvent avoir d’abord réclamé sans succès directement auprès de l’entreprise et pouvoir prouver sa correspondance.",
      },
    ],
    faqs: [
      {
        question: "Comment rédiger une réclamation efficace ?",
        answer:
          "Décrivez les faits de manière concise et chronologique, mentionnez les références et les preuves et demandez une solution concrète et appropriée dans un délai réaliste.",
      },
      {
        question: "Comment formuler une réclamation poliment mais fermement ?",
        answer:
          "Utilisez des faits neutres, évitez les attaques personnelles et écrivez clairement quelle correction vous attendez. Un ton calme augmente les chances d’une réponse constructive.",
      },
      {
        question: "Quelles preuves dois-je joindre ?",
        answer:
          "Sont appropriés par exemple le contrat, la confirmation de commande, la facture, des photos et la correspondance antérieure. En principe, envoyez des copies et conservez les originaux chez vous.",
      },
      {
        question: "Une réclamation doit-elle être envoyée en recommandé ?",
        answer:
          "Non, pas toujours. Pour des montants élevés, des délais en cours ou une éventuelle escalade, un envoi traçable est toutefois souvent utile.",
      },
    ],
    related: ["einsprache-erheben", "mahnung-schreiben", "einschreiben-online"],
  },
  {
    slug: "mahnung-schreiben",
    category: "Créance",
    metaTitle: "Rappel de paiement – exiger le règlement efficacement",
    metaDescription:
      "Rédiger un rappel clair avec référence de facture, montant dû et nouveau délai de paiement. episto formule et envoie votre courrier – également en recommandé.",
    h1: "Rédiger un rappel de paiement : exiger un paiement ouvert de manière professionnelle",
    quickAnswer:
      "Pour rédiger un rappel de paiement, mentionnez la facture, le montant dû, l’échéance initiale et un nouveau délai de paiement raisonnable. Formulez de manière objective, indiquez les coordonnées de paiement et n’annoncez d’autres démarches que si vous avez l’intention de les vérifier et de les mettre en œuvre. episto rédige votre rappel et l’envoie de manière traçable.",
    steps: [
      {
        title: "Vérifier la créance",
        text: "Contrôlez le contrat, la facture, l’échéance, les paiements antérieurs et l’adresse correcte du débiteur.",
      },
      {
        title: "Fixer un nouveau délai",
        text: "Fixez une date de paiement concrète et raisonnable et décidez si vous souhaitez d’abord un simple rappel ou déjà une mise en demeure formelle.",
      },
      {
        title: "Rédiger le rappel",
        text: "Indiquez clairement le montant, le numéro de facture, l’échéance et les informations de paiement. episto formule le courrier de manière professionnelle et ferme.",
      },
      {
        title: "Consigner l’envoi et la réaction",
        text: "Documentez l’envoi, la réception du paiement et les réponses. Pour un dernier rappel ou une créance plus importante, un recommandé est conseillé.",
      },
    ],
    checklist: [
      "Noms et adresses complets des deux parties",
      "Numéro de facture, date de facture et prestation",
      "Montant dû et échéance initiale",
      "Nouveau délai de paiement concret",
      "IBAN ou autres indications de paiement claires",
    ],
    notes: [
      {
        title: "La demeure dépend de l’échéance",
        body: "La nécessité d’un rappel pour constituer le débiteur en demeure dépend notamment de l’existence d’un terme de paiement convenu. Examinez le cas particulier.",
      },
      {
        title: "Ne pas inventer des frais et intérêts sans base",
        body: "Les frais de rappel doivent être convenus contractuellement et être raisonnables. Les intérêts moratoires et autres frais dépendent de la convention et de la situation juridique ; n’indiquez que des montants compréhensibles.",
      },
    ],
    faqs: [
      {
        question: "Comment dois-je rédiger un rappel de paiement ?",
        answer:
          "Mentionnez la facture concrète, le montant dû, l’échéance et une nouvelle date de paiement. Ajoutez les informations de paiement et demandez un retour si le paiement a déjà été effectué.",
      },
      {
        question: "Quel délai de paiement dois-je fixer dans le rappel ?",
        answer:
          "Le délai doit être réaliste et indiqué sous forme de date concrète. Ce qui est raisonnable dépend du montant, des contacts antérieurs et des circonstances de la créance.",
      },
      {
        question: "Puis-je exiger des frais de rappel et des intérêts moratoires ?",
        answer:
          "Cela n’est pas automatiquement admissible dans n’importe quelle mesure. Vérifiez le contrat, les CG et la situation juridique concrète et n’indiquez que des montants justifiés de manière compréhensible.",
      },
      {
        question: "Quand dois-je envoyer un rappel en recommandé ?",
        answer:
          "Un recommandé est particulièrement utile pour une dernière demande de paiement, des montants élevés ou une éventuelle poursuite ultérieure, car vous pouvez documenter l’envoi.",
      },
    ],
    related: ["einschreiben-online", "beschwerde-schreiben", "brief-online-versenden"],
  },
  {
    slug: "einsprache-erheben",
    category: "Courrier soumis à un délai",
    metaTitle: "Faire opposition – délai & lettre pour la Suisse",
    metaDescription:
      "Faire opposition à une facture ou une décision administrative : vérifiez délai, autorité compétente, motifs et preuves. episto rédige et envoie la lettre.",
    h1: "Faire opposition : réagir dans les délais et de manière compréhensible",
    quickAnswer:
      "Pour faire opposition, vérifiez d’abord quel moyen de droit est admissible, quelle autorité est compétente et quand le délai expire. Désignez précisément la décision attaquée, formulez une demande claire et motivez-la avec des preuves. Pour les factures, une contestation écrite suffit souvent. episto formule et envoie votre courrier.",
    steps: [
      {
        title: "Vérifier le moyen de droit et le délai",
        text: "Lisez entièrement la facture ou la décision reçue. L’indication des voies de droit mentionne souvent la procédure, l’autorité compétente, la forme et le délai.",
      },
      {
        title: "Ordonner la demande et les motifs",
        text: "Notez ce qui doit être modifié ou annulé et quels faits, documents ou calculs étayent votre position.",
      },
      {
        title: "Rédiger le courrier",
        text: "Désignez le document avec sa date et son numéro de référence et formulez clairement la demande et les motifs. episto structure la lettre.",
      },
      {
        title: "Déposer dans les délais",
        text: "Signez le courrier, joignez les preuves et envoyez-le de manière traçable à l’autorité compétente. Conservez une copie complète.",
      },
    ],
    checklist: [
      "Autorité destinataire ou instance de recours compétente",
      "Date, numéro de référence et désignation de la décision",
      "Demande claire : que faut-il modifier ?",
      "Motivation compréhensible avec preuves",
      "Date, signature et preuve d’envoi dans les délais",
    ],
    notes: [
      {
        title: "Tous les courriers ne s’appellent pas opposition",
        body: "Selon le document, une opposition, une réclamation, un recours ou une simple contestation peut être prévu. Utilisez la procédure et l’autorité indiquées dans l’indication des voies de droit.",
      },
      {
        title: "Sécuriser les délais immédiatement",
        body: "Les délais de recours peuvent être courts et ne sont souvent pas prolongeables. Vérifiez le début, la fin et les exigences formelles dès réception du document.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je faire opposition ?",
        answer:
          "Suivez l’indication des voies de droit, désignez la décision attaquée, formulez une demande claire et déposez la motivation, la signature et les preuves dans les délais auprès de l’autorité compétente.",
      },
      {
        question: "Quel est le délai d’opposition ?",
        answer:
          "Le délai dépend de la procédure et de l’autorité. Ce sont la procédure applicable et l’indication des voies de droit figurant sur la décision concrète qui font foi ; vérifiez-les immédiatement.",
      },
      {
        question: "Puis-je faire opposition contre une facture incorrecte ?",
        answer:
          "Pour une facture privée, il ne s’agit généralement pas d’une opposition formelle, mais d’une contestation ou d’une réclamation écrite. Mentionnez les postes contestés et vos motifs.",
      },
      {
        question: "Un bref courrier sans motivation suffit-il ?",
        answer:
          "Cela dépend des règles de procédure et peut être risqué. Dans la mesure du possible, déposez une demande claire et une motivation compréhensible avec les preuves dans le délai imparti.",
      },
    ],
    related: ["brief-an-behoerde", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "mietzins-senken",
    category: "Droit du bail",
    metaTitle: "Baisser son loyer – rédiger une demande de baisse",
    metaDescription:
      "Demander une baisse de loyer après la baisse du taux d’intérêt de référence : base, terme et délais. episto rédige et envoie votre demande par courrier.",
    h1: "Baisser son loyer : déposer correctement une demande de baisse",
    quickAnswer:
      "Pour baisser son loyer, comparez le taux d’intérêt de référence sur lequel repose le loyer actuel avec le taux en vigueur aujourd’hui. S’il existe en principe un droit, adressez au bailleur une demande de baisse écrite pour le prochain terme de résiliation possible. D’autres facteurs de coûts peuvent influencer la réduction. episto formule et envoie votre demande.",
    steps: [
      {
        title: "Déterminer la situation de départ",
        text: "Consultez le bail et la dernière adaptation du loyer. Il y est souvent indiqué quel taux d’intérêt de référence est à la base du loyer net actuel.",
      },
      {
        title: "Estimer grossièrement le droit",
        text: "Comparez le taux d’intérêt de référence d’alors avec le taux actuel et tenez compte des éventuels facteurs contraires comme le renchérissement ou les hausses générales de coûts.",
      },
      {
        title: "Rédiger la demande de baisse",
        text: "Exigez l’adaptation du loyer net pour le prochain terme possible et demandez un calcul compréhensible. episto rédige la lettre.",
      },
      {
        title: "Surveiller la réponse et les délais",
        text: "Envoyez si possible en recommandé et notez la date d’envoi. Examinez sans tarder un refus ou un calcul compensatoire.",
      },
    ],
    checklist: [
      "Adresse complète des locataires et du bailleur",
      "Adresse du logement concerné",
      "Loyer net actuel",
      "Taux d’intérêt de référence précédent et actuel déterminant",
      "Terme d’adaptation demandé et demande de confirmation",
    ],
    notes: [
      {
        title: "Le taux d’intérêt de référence est déterminant",
        body: "Pour les baux en cours, c’est le taux d’intérêt de référence hypothécaire qui compte, et non directement le taux directeur de la Banque nationale. Le point de départ est généralement le taux en vigueur lors de la conclusion du bail ou de la dernière adaptation.",
      },
      {
        title: "Respecter les délais de réponse et de conciliation",
        body: "Le bailleur doit en principe répondre dans les 30 jours. En cas de refus ou d’absence de réponse, des délais brefs s’appliquent pour saisir l’autorité de conciliation ; vérifiez-les sans tarder.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je baisser mon loyer ?",
        answer:
          "Vérifiez le taux d’intérêt de référence déterminant pour votre loyer et adressez au bailleur une demande de baisse écrite et motivée pour le prochain terme de résiliation possible.",
      },
      {
        question:
          "Toute baisse du taux d’intérêt de référence entraîne-t-elle une baisse de loyer ?",
        answer:
          "Pas nécessairement. C’est le taux sur lequel repose votre loyer actuel qui est décisif ; de plus, le bailleur peut, selon le cas, opposer le renchérissement ou des hausses de coûts.",
      },
      {
        question: "À partir de quand la baisse de loyer s’applique-t-elle ?",
        answer:
          "Une baisse n’a en principe pas d’effet rétroactif, mais au plus tôt pour un prochain terme de résiliation admissible. Envoyez donc la demande suffisamment tôt avant le début du délai de résiliation.",
      },
      {
        question: "Que faire si le bailleur refuse ?",
        answer:
          "Examinez immédiatement la motivation et le calcul. Si vous n’êtes pas d’accord ou si vous ne recevez pas de réponse, vous pouvez saisir l’autorité de conciliation compétente dans le délai déterminant.",
      },
    ],
    related: [
      "wohnung-kuendigen",
      "nebenkostenabrechnung-pruefen",
      "einschreiben-online",
    ],
  },
  {
    slug: "brief-an-behoerde",
    category: "Courrier aux autorités",
    metaTitle: "Rédiger un courrier aux autorités & l’envoyer en ligne",
    metaDescription:
      "Rédiger un courrier clair à l’office, à la commune ou à l’administration : référence, demande, délai et preuves. episto vous aide à l’envoyer en toute sécurité.",
    h1: "Rédiger un courrier aux autorités : clair, complet et dans les délais",
    quickAnswer:
      "Pour rédiger un courrier à une autorité, mentionnez le service compétent, vos données personnelles et une éventuelle référence de dossier. Formulez votre demande de manière claire, motivez-la brièvement et joignez les preuves exigées. Respectez les délais et les exigences de forme. episto rédige et envoie votre courrier aux autorités.",
    steps: [
      {
        title: "Clarifier la compétence",
        text: "Vérifiez quel office ou quel service communal traite votre demande et si un formulaire ou une voie de dépôt particulière est prescrit.",
      },
      {
        title: "Rassembler les documents",
        text: "Préparez la référence du dossier, les dates pertinentes, les courriers antérieurs et les preuves exigées. Utilisez des copies bien lisibles.",
      },
      {
        title: "Formuler la demande",
        text: "Écrivez clairement ce que vous demandez ou souhaitez savoir, et classez les principaux motifs. episto met votre demande en forme professionnelle.",
      },
      {
        title: "Déposer dans les délais",
        text: "Signez, contrôlez les annexes et, en cas de délai en cours, choisissez un envoi traçable. Conservez une copie complète.",
      },
    ],
    checklist: [
      "Nom complet, adresse et coordonnées",
      "Autorité correcte et service compétent",
      "Numéro de dossier, de référence ou d’affaire",
      "Demande claire avec motivation",
      "Date, signature et annexes désignées",
    ],
    notes: [
      {
        title: "Le formulaire peut être obligatoire",
        body: "Pour certaines demandes, annonces ou moyens de droit, la Confédération, le canton ou la commune exigent un formulaire officiel ou un canal numérique déterminé. Vérifiez les prescriptions avant l’envoi.",
      },
      {
        title: "Documenter le délai et la notification",
        body: "Pour les décisions et les procédures en cours, des délais brefs peuvent s’appliquer. Respectez l’indication des voies de droit et conservez les preuves de dépôt ou de réception.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je rédiger un courrier à une autorité ?",
        answer:
          "Mentionnez le service compétent, vos données personnelles et la référence du dossier, formulez une demande claire et motivez-la avec les données et preuves nécessaires.",
      },
      {
        question: "Comment trouver la bonne autorité ?",
        answer:
          "Consultez le courrier reçu, le site internet de votre commune ou de votre canton ou renseignez-vous auprès de l’administration. Un envoi à la mauvaise autorité peut être risqué en cas de délai.",
      },
      {
        question: "Un courrier aux autorités nécessite-t-il une signature ?",
        answer:
          "Pour les demandes formelles et les moyens de droit, une signature est souvent requise. Respectez les prescriptions concrètes de procédure ou de formulaire du service compétent.",
      },
      {
        question: "Dois-je envoyer le courrier à l’office en recommandé ?",
        answer:
          "En cas de délai important ou de demande formelle, un envoi traçable est souvent utile. L’essentiel reste que le courrier soit déposé à temps auprès du service compétent.",
      },
    ],
    related: ["einsprache-erheben", "einschreiben-online", "brief-online-versenden"],
  },
  {
    slug: "brief-online-versenden",
    category: "Envoi",
    metaTitle: "Envoyer une lettre en ligne – impression & envoi postal",
    metaDescription:
      "Envoyer une lettre en ligne par La Poste Suisse, sans imprimante ni passage au guichet. episto prend en charge la rédaction, l’impression et l’envoi.",
    h1: "Envoyer une lettre en ligne – sans imprimante ni passage au bureau de poste",
    quickAnswer:
      "Pour envoyer une lettre en ligne, vous saisissez le contenu et le destinataire de manière numérique, vérifiez le courrier finalisé et mandatez l’impression, la mise sous enveloppe et le dépôt postal. Selon la demande, choisissez le courrier standard ou le recommandé. Vous économisez ainsi l’imprimante et le déplacement au guichet. Avec episto, vous faites tout en ligne en quelques minutes.",
    steps: [
      {
        title: "Saisir la demande",
        text: "Décrivez à qui vous écrivez et ce que vous souhaitez obtenir. episto en fait une lettre adaptée et professionnelle.",
      },
      {
        title: "Vérifier la lettre",
        text: "Contrôlez et modifiez le contenu, l’expéditeur, le destinataire, la date et les éventuelles annexes avant validation.",
      },
      {
        title: "Choisir le mode d’envoi",
        text: "Choisissez la lettre standard ou le recommandé selon le délai, l’importance et la preuve souhaitée. Le prix est affiché avant le paiement.",
      },
      {
        title: "Confier l’impression et l’envoi",
        text: "episto imprime et met sous enveloppe votre courrier et le remet à La Poste Suisse. Vous n’avez ni à imprimer ni à vous rendre au guichet.",
      },
    ],
    checklist: [
      "Adresse complète de l’expéditeur",
      "Adresse correcte du destinataire en Suisse",
      "Objet clair et contenu de la lettre vérifié",
      "Éventuelles annexes au format PDF",
      "Mode d’envoi adapté : standard ou recommandé",
    ],
    notes: [
      {
        title: "Recommandé pour les délais importants",
        body: "Pour les résiliations, les oppositions ou d’autres déclarations importantes, un recommandé est souvent utile. Il documente le dépôt et la distribution mieux qu’une lettre standard.",
      },
      {
        title: "Vérifier l’adresse avant validation",
        body: "episto envoie aux adresses de destinataires en Suisse. Contrôlez soigneusement le nom, la rue, le numéro, le NPA et la localité avant de confirmer la commande.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je envoyer une lettre en ligne ?",
        answer:
          "Vous saisissez le contenu et l’adresse en ligne, vérifiez la lettre finalisée et choisissez le mode d’envoi. episto prend en charge l’impression, la mise sous enveloppe et la remise à La Poste Suisse.",
      },
      {
        question: "Ai-je besoin d’une imprimante ou de timbres ?",
        answer:
          "Non. Vous créez et payez la lettre en ligne ; episto s’occupe du papier, de l’impression, de l’enveloppe, de l’affranchissement et du dépôt postal.",
      },
      {
        question: "Puis-je envoyer la lettre en recommandé ?",
        answer:
          "Oui. Choisissez l’option « Recommandé » avant le paiement si vous avez besoin d’une preuve de dépôt et de distribution.",
      },
      {
        question: "Puis-je joindre des annexes ?",
        answer:
          "Oui. Vous pouvez en principe ajouter les annexes pertinentes au format PDF. Vérifiez avant validation que toutes les pages sont complètes et bien lisibles.",
      },
    ],
    related: ["einschreiben-online", "brief-an-behoerde", "beschwerde-schreiben"],
  },
  {
    slug: "nebenkostenabrechnung-pruefen",
    category: "Droit du bail",
    metaTitle: "Contester un décompte de charges – lettre & envoi",
    metaDescription:
      "Vérifier le décompte de charges, demander les justificatifs et contester les postes peu clairs. episto rédige et envoie votre contestation par courrier.",
    h1: "Vérifier le décompte de charges et contester les irrégularités",
    quickAnswer:
      "Pour vérifier un décompte de charges, comparez la période de décompte, les types de frais convenus contractuellement, les acomptes versés et la clé de répartition. En cas de doute, demandez un relevé détaillé et la consultation des justificatifs. Contestez des postes concrets par écrit plutôt que de refuser globalement la facture. episto formule et envoie votre contestation.",
    steps: [
      {
        title: "Comparer avec le bail",
        text: "Vérifiez quels frais accessoires sont convenus séparément et si vous payez des acomptes, un forfait ou certains frais directement.",
      },
      {
        title: "Recalculer le décompte",
        text: "Contrôlez la période, le logement, les acomptes, les frais totaux, la clé de répartition et le solde qui en résulte.",
      },
      {
        title: "Demander les justificatifs et une explication",
        text: "Pour les postes qui ressortent, demandez une explication compréhensible et la consultation des factures ou des bases de calcul.",
      },
      {
        title: "Envoyer une contestation concrète",
        text: "Désignez précisément les postes litigieux et vos questions. episto en fait une lettre objective au bailleur ou à la régie.",
      },
    ],
    checklist: [
      "Bail et types de frais accessoires convenus",
      "Période de décompte et logement concerné",
      "Acomptes versés",
      "Postes et montants contestés",
      "Demande de consultation des justificatifs, d’explication et de décompte corrigé",
    ],
    notes: [
      {
        title: "Seuls les frais accessoires convenus sont facturés séparément",
        body: "Les frais accessoires doivent en principe être convenus concrètement dans le bail pour pouvoir être exigés en plus du loyer net. Les termes collectifs généraux peuvent soulever des questions.",
      },
      {
        title: "La consultation des justificatifs apporte de la clarté",
        body: "Les locataires peuvent en principe demander la consultation des justificatifs sur lesquels repose le décompte. Faites la demande rapidement et mentionnez les postes peu clairs.",
      },
    ],
    faqs: [
      {
        question: "Comment puis-je vérifier mon décompte de charges ?",
        answer:
          "Comparez les types de frais avec le bail et contrôlez la période, les acomptes, la clé de répartition et le solde. Pour les montants peu clairs, demandez les justificatifs et des explications.",
      },
      {
        question: "Puis-je consulter les justificatifs du décompte de charges ?",
        answer:
          "Oui, les locataires peuvent en principe demander la consultation des justificatifs sous-jacents. Convenez avec le bailleur ou la régie de la manière et du lieu de consultation.",
      },
      {
        question: "Quels frais accessoires le bailleur peut-il facturer ?",
        answer:
          "Ne peuvent être facturés séparément que les frais accessoires en lien avec l’usage du logement, concrètement convenus dans le bail. L’entretien et l’administration n’en font pas partie librement.",
      },
      {
        question: "Dois-je payer immédiatement un supplément contesté ?",
        answer:
          "N’ignorez pas la facture. Contestez immédiatement les postes concrets par écrit et clarifiez comment traiter les montants non contestés et contestés jusqu’à la vérification.",
      },
    ],
    related: ["mietzins-senken", "beschwerde-schreiben", "einschreiben-online"],
  },
];
