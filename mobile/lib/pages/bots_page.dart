import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/bots_controller.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.put(BotsController());

    return Obx(() => ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: controller.bots.length,
      itemBuilder: (context, index) {
        final bot = controller.bots[index];
        return Card(
          margin: const EdgeInsets.symmetric(vertical: 8),
          elevation: 3,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            leading: const Icon(Icons.android, size: 40),
            title: Text(
              bot["name"]!,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            subtitle: Text(bot["description"]!),
            trailing: const Icon(Icons.arrow_forward_ios),
            onTap: () {
              print("${bot["name"]} presionado");
            },
          ),
        );
      },
    ));
  }
}
