import 'package:blacker/controllers/alerts_controller.dart';
import 'package:blacker/controllers/theme_controller.dart';
import 'package:blacker/pages/alerts_page.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/main_controller.dart';
import 'bots_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeController themeController = Get.find();
    final MainController controller = Get.put(MainController());
    final AlertsController alertsController = Get.put(AlertsController());

    final List<Widget> pages = const [
      Center(child: Text("0", style: TextStyle(fontSize: 24))),
      BotsPage(),
      Center(child: Text("2", style: TextStyle(fontSize: 24))),
      AlertsPage(),
    ];

    final double iconSize = 20.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text(""),
        centerTitle: true,
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        foregroundColor: Theme.of(context).appBarTheme.foregroundColor,
        actions: [
          IconButton(
            onPressed: themeController.toggleTheme,
            icon: Obx(
              () => SvgPicture.asset(
                themeController.isDark.value
                    ? "assets/icons/sun.svg"
                    : "assets/icons/moon.svg",
                width: iconSize,
                height: iconSize,
                colorFilter: ColorFilter.mode(
                  Theme.of(context).appBarTheme.iconTheme?.color ??
                      Colors.white,
                  BlendMode.srcIn,
                ),
              ),
            ),
          ),
        ],
      ),

      body: Obx(() => pages[controller.currentIndex.value]),

      bottomNavigationBar: Theme(
        data: Theme.of(context).copyWith(
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
        ),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: Theme.of(context).dividerColor, width: 1),
            ),
          ),
          child: Obx(
            () => BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              currentIndex: controller.currentIndex.value,
              onTap: controller.cambiarIndice,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              elevation: 1,
              backgroundColor: Theme.of(context).bottomNavigationBarTheme.backgroundColor,
              selectedItemColor: Theme.of(context).bottomNavigationBarTheme.selectedItemColor, 
              unselectedItemColor: Theme.of(context).bottomNavigationBarTheme.unselectedItemColor,
              selectedLabelStyle: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(height: 2),
              unselectedLabelStyle: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(height: 2),
              items: [
                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/home.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).appBarTheme.iconTheme?.color ??
                          Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/home.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).colorScheme.primary,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Home",
                ),

                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/bots.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).appBarTheme.iconTheme?.color ??
                          Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/bots.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).colorScheme.primary,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Bots",
                ),

                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/list.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).appBarTheme.iconTheme?.color ??
                          Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/list.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).colorScheme.primary,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Orders",
                ),

                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/bell.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).appBarTheme.iconTheme?.color ??
                          Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/bell.svg",
                    width: iconSize,
                    height: iconSize,
                    colorFilter: ColorFilter.mode(
                      Theme.of(context).colorScheme.primary,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Alerts",
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
