import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/bots_controller.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.put(BotsController());

    return Obx(() {
      if (controller.bots.isEmpty) {
        return const Center(
          child: Text(
            "No hay bots disponibles",
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
        );
      }

      return ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: controller.bots.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final bot = controller.bots[index];

          // Lista de acciones
          final actions = [
            {"title": "Chat", "subtitle": "Conversar"},
            {"title": "Info", "subtitle": "Detalles"},
            {"title": "Config", "subtitle": "Ajustes"},
            {"title": "Stats", "subtitle": "Estadísticas"},
            {"title": "Help", "subtitle": "Ayuda"},
            {"title": "Share", "subtitle": "Compartir"},
            {"title": "Rate", "subtitle": "Calificar"},
            {"title": "Report", "subtitle": "Reportar"},
            {"title": "More", "subtitle": "Más opciones"},
          ];

          // Número de filas necesarias para el Grid
          final crossAxisCount = 3;
          final rowCount = (actions.length / crossAxisCount).ceil();
          final tileHeight = 45.0; // altura estimada de cada ListTile
          final gridHeight = rowCount * tileHeight;

          return Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 3,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    contentPadding:
                        EdgeInsets.zero, // para que no haya padding extra
                    leading: SvgPicture.asset(
                      'assets/icons/binance.svg',
                      width: 30,
                      height: 30,
                    ),
                    title: Text(
                      bot["name"] ?? "Nombre desconocido",
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    subtitle: Text(
                      bot["description"] ?? "Sin descripción",
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  ),
                
                  ListTile(
                    title: const Text('PnL', style: TextStyle(color: Colors.grey, fontSize: 10)),
                    contentPadding: EdgeInsets.zero,
                    subtitle: const Text(
                      '\$1,250.50',
                      style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    onTap: () => print("${bot["name"]} - PnL presionado"),
                  ),

                  SizedBox(
                    height: gridHeight,
                    child: GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: crossAxisCount,
                      childAspectRatio: 3.0,
                      crossAxisSpacing: 2,
                      mainAxisSpacing: 2,
                      children: actions.map((action) {
                        return ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: Text(
                            action["title"]!,
                            style: const TextStyle(fontSize: 10, color: Colors.grey),
                          ),
                          subtitle: Text(
                            action["subtitle"]!,
                            style: const TextStyle(fontSize: 10, color: Colors.black),
                          ),
                          onTap: () => print(
                            "${bot["name"]} - ${action["title"]} presionado",
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    });
  }
}
