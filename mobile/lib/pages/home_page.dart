import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/main_controller.dart';
import 'bots_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final MainController controller = Get.put(MainController());

    final List<Widget> pages = const [
      Center(child: Text("🏠 Página Inicio", style: TextStyle(fontSize: 24))),
      BotsPage(),
      Center(child: Text("👤 Página Perfil", style: TextStyle(fontSize: 24))),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(""),
        centerTitle: true,
        backgroundColor: Colors.white,
        actions: [
          IconButton(
            icon: SvgPicture.asset(
              "assets/icons/home.svg",
              width: 24,
              height: 24,
              colorFilter: const ColorFilter.mode(Colors.grey, BlendMode.srcIn),
            ),
            onPressed: () {
              print("Buscar presionado");
            },
          ),
          IconButton(
            icon: SvgPicture.asset(
              "assets/icons/orders.svg",
              width: 24,
              height: 24,
              colorFilter: const ColorFilter.mode(Colors.grey, BlendMode.srcIn),
            ),
            onPressed: () {
              print("Perfil presionado");
            },
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
              selectedItemColor: Colors.blue,
              unselectedItemColor: Colors.grey,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              elevation: 1,
              backgroundColor: Colors.white,
              items: [
                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/home.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.grey,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/home.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.blue,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Home",
                ),
                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/list.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.grey,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/list.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.blue,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Bots",
                ),
                BottomNavigationBarItem(
                  icon: SvgPicture.asset(
                    "assets/icons/orders.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.grey,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/orders.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.blue,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Orders",
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
