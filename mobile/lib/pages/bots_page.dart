import 'package:flutter/material.dart';
import 'package:get/get.dart';
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
        separatorBuilder: (context, index) =>
            Divider(height: 16, color: Colors.grey.withAlpha(0)),
        itemBuilder: (context, index) {
          final bot = controller.bots[index];
          return Card(
            child: Container(
              height: 300,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bot["name"] ?? "Nombre desconocido",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Text(
                    bot["description"] ?? "Sin descripción",
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),

                  ListTile(
                    title: const Text('PnL'),
                    subtitle: const Text(
                      '\$1,250.50',
                      style: TextStyle(color: Colors.green),
                    ),
                    onTap: () => print("${bot["name"]} - PnL presionado"),
                  ),
                  
                  Expanded(
                    child: GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 3,
                      childAspectRatio: 3.0,
                      crossAxisSpacing: 2,
                      mainAxisSpacing: 2,
                      children: [
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Chat',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Conversar',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Chat presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Info',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Detalles',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Info presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Config',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Ajustes',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Config presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Stats',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Estadísticas',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Stats presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Help',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Ayuda',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Help presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Share',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Compartir',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Share presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Rate',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Calificar',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Rate presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'Report',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Reportar',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - Report presionado"),
                        ),
                        ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: const Text(
                            'More',
                            style: TextStyle(fontSize: 10),
                          ),
                          subtitle: const Text(
                            'Más opciones',
                            style: TextStyle(fontSize: 8),
                          ),
                          onTap: () =>
                              print("${bot["name"]} - More presionado"),
                        ),
                      ],
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
