export enum Routes {
  HOME = '/',
  ABOUT = '/about',
  PRIVACY = '/privacy',
  TERMS = '/terms',
  DESTINATION_CARIBBEAN = '/destinations/caribbean',
  DESTINATION_CASANARE = '/destinations/casanare',
  DESTINATION_COFFEE = '/destinations/coffee-region',
}

class AppRoutes {
  getHomeRoute() {
    return Routes.HOME;
  }

  getAboutRoute() {
    return Routes.ABOUT;
  }

  getPrivacyRoute() {
    return Routes.PRIVACY;
  }

  getTermsRoute() {
    return Routes.TERMS;
  }

  getCaribbeanRoute() {
    return Routes.DESTINATION_CARIBBEAN;
  }

  getCasanareRoute() {
    return Routes.DESTINATION_CASANARE;
  }

  getCoffeeRegionRoute() {
    return Routes.DESTINATION_COFFEE;
  }
}

export const appRoutes = new AppRoutes();
