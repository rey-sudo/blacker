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
        separatorBuilder: (context, index) => Divider(
          height: 1,
          color: Colors.grey.withAlpha(30)
        ),
        itemBuilder: (context, index) {
          final bot = controller.bots[index];
          return ListTile(
            leading: const Icon(Icons.android, size: 40),
            title: Text(
              bot["name"] ?? "Nombre desconocido",
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            subtitle: Text(bot["description"] ?? "Sin descripción"),
            onTap: () {
              print("${bot["name"]} presionado");
            },
          );
        },
      );
    });
  }
}
