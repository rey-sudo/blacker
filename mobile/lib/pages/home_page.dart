import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/main_controller.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final MainController controlador = Get.put(MainController());

    final List<Widget> paginas = const [
      Center(child: Text("🏠 Página Inicio", style: TextStyle(fontSize: 24))),
      Center(child: Text("🔍 Página Buscar", style: TextStyle(fontSize: 24))),
      Center(child: Text("👤 Página Perfil", style: TextStyle(fontSize: 24))),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("Demo con GetX"),
        centerTitle: true,
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
              "assets/icons/search.svg",
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

      body: Obx(() => paginas[controlador.indiceActual.value]),

      bottomNavigationBar: Theme(
        data: Theme.of(context).copyWith(
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
        ),
        child: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.1), width: 1)),
          ),
          child: Obx(
            () => BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              currentIndex: controlador.indiceActual.value,
              onTap: controlador.cambiarIndice,
              selectedItemColor: Colors.blue,
              unselectedItemColor: Colors.grey,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              elevation: 1, 
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
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
                    "assets/icons/search.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.grey,
                      BlendMode.srcIn,
                    ),
                  ),
                  activeIcon: SvgPicture.asset(
                    "assets/icons/search.svg",
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(
                      Colors.blue,
                      BlendMode.srcIn,
                    ),
                  ),
                  label: "Search",
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
