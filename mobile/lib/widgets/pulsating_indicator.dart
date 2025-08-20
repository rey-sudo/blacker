import 'package:flutter/material.dart';

class PulsatingIndicator extends StatefulWidget {
  final bool isActive; 
  final double size;

  const PulsatingIndicator({Key? key, required this.isActive, this.size = 12}) : super(key: key);

  @override
  _PulsatingIndicatorState createState() => _PulsatingIndicatorState();
}

class _PulsatingIndicatorState extends State<PulsatingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.8, end: 1.4).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: _animation.value,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.isActive ? Colors.green : Colors.red,
              border: Border.all(
                color: Colors.black.withAlpha(10), // borde semitransparente
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: (widget.isActive ? Colors.green : Colors.red).withAlpha(40),
                  blurRadius: 6,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
