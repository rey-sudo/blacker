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
                  const SizedBox(height: 16),

                  Expanded(
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 3.0,
                            crossAxisSpacing: 2,
                            mainAxisSpacing: 2,
                          ),
                      itemCount: 9,
                      itemBuilder: (context, gridIndex) {
                        return ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          title: Text(
                            'Item ${gridIndex + 1}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            'Sub ${gridIndex + 1}',
                            style: const TextStyle(fontSize: 12, color: Colors.black),
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () {
                            print(
                              "${bot["name"]} - Item ${gridIndex + 1} presionado",
                            );
                          },
                        );
                      },
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
