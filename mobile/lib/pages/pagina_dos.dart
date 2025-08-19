import 'package:flutter/material.dart';

class PaginaDos extends StatelessWidget {
  const PaginaDos({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Página Dos")),
      body: Center(
        child: ElevatedButton(
          child: const Text("Volver"),
          onPressed: () => Navigator.pop(context),
        ),
      ),
    );
  }
}
